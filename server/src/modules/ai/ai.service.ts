import axios from 'axios';
import { Types } from 'mongoose';
import { AIChatModel } from './ai.model';
import { AIKeyService } from './ai-key.service';
import { AIAnonymizer } from './ai-anonymizer';
import { aiTools, executeTool } from './ai.tools';
import { IAIChat, IMessage, AnalysisType, ScopeType, ROLE_TOOL_MAP } from './ai.types';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors';
import { cacheAside } from '../../core/utils/cacheAside';
import { env } from '../../config/env';
import { logger } from '../../core/utils/logger';
import { ExamModel } from '../exam/exam.model';

const OPENROUTER_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';

export class AIService {
  /**
   * Helper: Get allowed tools for a specific role.
   */
  private static getToolsForRole(role: string) {
    const allowedNames = ROLE_TOOL_MAP[role] || [];
    return aiTools.filter(t => allowedNames.includes(t.function.name));
  }

  /**
   * Helper: Get role-specific system prompt.
   */
  private static async buildSystemPrompt(role: string, departmentScope: string | null): Promise<string> {
    let deptName = 'your department';
    if (departmentScope) {
      try {
        const Department = (AIChatModel.db as any).model('Department');
        const dept = await Department.findById(departmentScope).lean();
        if (dept) deptName = dept.name;
      } catch (err) {
        logger.warn(err, 'Failed to fetch department name for system prompt');
      }
    }

    switch (role) {
      case 'student':
        return `You are Atlas AI, a personal academic advisor. You can access this student's own marks, CO attainment, and enrollments. Provide performance analysis, identify their weakest COs with specific Bloom levels, suggest targeted study strategies, and offer career guidance based on their PO strengths. Be encouraging, precise, and actionable.`;
      case 'faculty':
        return `You are Atlas AI, a teaching analytics assistant. You can analyze class performance for your course offerings. Students are anonymized (Student A, Student B, etc.). Identify at-risk students, pinpoint which COs have low attainment, hypothesize pedagogical root causes, and recommend teaching strategy adjustments for specific Bloom levels. Keep responses professional and data-driven.`;
      case 'HOD':
      case 'supervisor':
        return `You are Atlas AI, a department analytics engine for the "${deptName}" department. Analyze batch and department-wide CO/PO attainment trends. Students are anonymized. Compare offerings, identify systemic CO weaknesses across courses, and generate strategic improvement reports.`;
      case 'admin':
        return `You are Atlas AI, an administrative analytics assistant for the "${deptName}" department. Analyze student attainment and mark trends. Students are anonymized. Summarize departmental performance and suggest systemic actions.`;
      case 'superadmin':
        return `You are Atlas AI, a university-wide analytics engine. You can access data across all departments. Compare department-level PO attainment, identify cross-department trends, and generate strategic institutional reports.`;
      default:
        return `You are Atlas AI, an educational assistant. Provide insights and analysis based on available academic data.`;
    }
  }

  /**
   * Main chat logic with tool-calling loop and token-by-token streaming.
   */
  static async chat(
    params: {
      userId: string;
      chatId?: string;
      message: string;
      model?: string;
      role: string;
      departmentScope: string | null;
    },
    onChunk: (chunk: { type: string; content?: string; toolName?: string }) => void
  ): Promise<IAIChat> {
    const { userId, chatId, message, model, role, departmentScope } = params;

    // 1. Fetch user's preferred model and API key
    const userStatus = await AIKeyService.getKeyStatus(userId);
    const preferredModel = model || userStatus.preferredModel || env.AI_DEFAULT_MODEL;

    const apiKey = await AIKeyService.getDecryptedKey(userId);
    if (!apiKey) {
      throw new ForbiddenError('AI API Key is not configured. Please save your OpenRouter key first.');
    }

    // 2. Fetch or create AIChat document
    let chat: IAIChat;
    if (chatId) {
      const existing = await AIChatModel.findOne({ _id: chatId, user: userId });
      if (!existing) throw new NotFoundError('AIChat', chatId);
      chat = existing;
    } else {
      chat = new AIChatModel({
        user: new Types.ObjectId(userId),
        title: message.length > 30 ? message.slice(0, 30) + '...' : message,
        aiModel: preferredModel,
        role: role,
        messages: [],
      });
    }

    // Append user message
    chat.messages.push({ role: 'user', content: message });
    await chat.save();

    // 3. Instantiate Anonymizer if role needs it
    const anonymizer = new AIAnonymizer();
    const shouldAnonymize = AIAnonymizer.shouldAnonymize(role);

    // 4. Initialize tool loop
    const maxRounds = 5;
    let round = 0;
    const allowedTools = this.getToolsForRole(role);

    while (round < maxRounds) {
      round++;
      
      // Prepare full message sequence for API
      const apiMessages: IMessage[] = [];
      
      // Inject system prompt if not present
      const systemPrompt = await this.buildSystemPrompt(role, departmentScope);
      apiMessages.push({ role: 'system', content: systemPrompt });

      // Add historical messages
      apiMessages.push(...chat.messages.map(m => ({
        role: m.role,
        content: m.content || '',
        name: m.name,
        tool_call_id: m.tool_call_id,
        tool_calls: m.tool_calls,
      })));

      // Call OpenRouter
      const response = await axios.post(
        OPENROUTER_COMPLETIONS_URL,
        {
          model: preferredModel,
          messages: apiMessages,
          tools: allowedTools.length > 0 ? allowedTools : undefined,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://github.com/realSalman/Synapse-AI-Task-Manager',
            'X-Title': 'AtlasAI',
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        }
      );

      // Consume response stream
      let accumulatedContent = '';
      let accumulatedToolCalls: any[] = [];
      
      await new Promise<void>((resolve, reject) => {
        let buffer = '';
        
        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          
          while (true) {
            const newlineIndex = buffer.indexOf('\n');
            if (newlineIndex === -1) break;
            
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                continue;
              }
              
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) continue;
                
                if (delta.content) {
                  accumulatedContent += delta.content;
                  // Only stream tokens directly if we have no tools being called in this chunk
                  onChunk({ type: 'token', content: delta.content });
                }
                
                if (delta.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (tc.index === undefined) continue;
                    
                    if (!accumulatedToolCalls[tc.index]) {
                      accumulatedToolCalls[tc.index] = {
                        id: tc.id || '',
                        type: 'function',
                        function: { name: tc.function?.name || '', arguments: '' }
                      };
                    }
                    
                    if (tc.id) {
                      accumulatedToolCalls[tc.index].id = tc.id;
                    }
                    if (tc.function?.name) {
                      accumulatedToolCalls[tc.index].function.name = tc.function.name;
                    }
                    if (tc.function?.arguments) {
                      accumulatedToolCalls[tc.index].function.arguments += tc.function.arguments;
                    }
                  }
                }
              } catch (err) {
                // Ignore parsing errors for cut-off stream blocks
              }
            }
          }
        });
        
        response.data.on('end', () => {
          resolve();
        });
        
        response.data.on('error', (err: any) => {
          reject(err);
        });
      });

      // Filter out empty spaces or incomplete tool calls
      accumulatedToolCalls = accumulatedToolCalls.filter(tc => tc && tc.function.name);

      if (accumulatedToolCalls.length > 0) {
        // We have tool calls. Execute them and append to chat.
        // Save assistant's tool-call request to messages
        chat.messages.push({
          role: 'assistant',
          content: accumulatedContent || '',
          tool_calls: accumulatedToolCalls.map(tc => ({
            id: tc.id,
            type: tc.type,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments
            }
          }))
        });

        // Execute each tool
        for (const tc of accumulatedToolCalls) {
          const toolName = tc.function.name;
          let toolArgs: any = {};
          
          try {
            toolArgs = JSON.parse(tc.function.arguments);
          } catch (e) {
            logger.warn(e, `Failed to parse tool arguments for ${toolName}`);
          }

          onChunk({ type: 'tool_start', toolName });

          let result: any;
          try {
            result = await executeTool(toolName, toolArgs, userId, role, departmentScope);
          } catch (err: any) {
            result = { error: err.message || 'Execution error' };
            logger.error(err, `Error executing tool ${toolName}`);
          }

          // Anonymize the results if necessary
          let finalResult = result;
          if (shouldAnonymize) {
            const rawArray = Array.isArray(result) ? result : [result];
            const { anonymized } = anonymizer.anonymize(rawArray);
            finalResult = Array.isArray(result) ? anonymized : anonymized[0];
          }

          onChunk({ type: 'tool_end', toolName });

          // Push tool response
          chat.messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: toolName,
            content: JSON.stringify(finalResult),
          });
        }
        
        await chat.save();
        // The loop continues to send the tool results back to the LLM
      } else {
        // No tools called. This is the final assistant response!
        let finalContent = accumulatedContent;
        if (shouldAnonymize) {
          finalContent = anonymizer.deAnonymize(accumulatedContent);
        }

        // Push final assistant response to DB
        chat.messages.push({
          role: 'assistant',
          content: finalContent,
        });
        
        await chat.save();

        // Send final done signal to stream containing the complete chat object
        onChunk({ type: 'done', content: chat as any });
        return chat;
      }
    }

    throw new Error('Tool loop execution exceeded maximum iterations.');
  }

  /**
   * One-shot quick analysis with Redis caching (1-hour TTL).
   */
  static async quickAnalyze(params: {
    userId: string;
    type: AnalysisType;
    scopeId: string;
    scopeType: ScopeType;
    role: string;
    departmentScope: string | null;
    semesterId?: string;
  }): Promise<{ content: string; cached: boolean }> {
    const { userId, type, scopeId, scopeType, role, departmentScope, semesterId } = params;

    // Check key before checking/writing cache
    const apiKey = await AIKeyService.getDecryptedKey(userId);
    if (!apiKey) {
      throw new ForbiddenError('AI API Key is not configured. Please save your OpenRouter key first.');
    }

    const cacheKey = semesterId ? `ai:report:${type}:${scopeId}:${semesterId}` : `ai:report:${type}:${scopeId}`;
    const ttl = 3600; // 1 hour

    let wasCached = true;

    const content = await cacheAside(cacheKey, ttl, async () => {
      wasCached = false;
      
      // Resolve active semester if needed for department/batch queries
      let activeSemesterId = semesterId;
      if (!activeSemesterId && (scopeType === 'department' || scopeType === 'batch')) {
        const Semester = (AIChatModel.db as any).model('Semester');
        const activeSem = await Semester.findOne({ status: 'active', department: departmentScope || undefined }).lean();
        if (activeSem) {
          activeSemesterId = activeSem._id.toString();
        } else {
          const anySem = await Semester.findOne({ department: departmentScope || undefined }).lean();
          if (anySem) {
            activeSemesterId = anySem._id.toString();
          } else {
            const fallbackSem = await Semester.findOne().lean();
            if (fallbackSem) {
              activeSemesterId = fallbackSem._id.toString();
            }
          }
        }
      }

      // 1. Gather context data using tool handlers
      let rawData: any;
      
      if (type === 'at-risk' && scopeType === 'offering') {
        rawData = await executeTool('get_at_risk_students', { offeringId: scopeId }, userId, role, departmentScope);
      } else if (type === 'root-cause') {
        if (scopeType === 'offering') {
          const attainment = await executeTool('get_offering_attainment', { offeringId: scopeId }, userId, role, departmentScope);
          const exams = await ExamModel.find({ courseOffering: scopeId, isDeleted: false }).lean();
          const summaries = [];
          for (const ex of exams) {
            try {
              const summary = await executeTool('get_exam_summary', { examId: ex._id.toString() }, userId, role, departmentScope);
              summaries.push({ examName: ex.name, summary });
            } catch (e) {
              // ignore exam-specific failures
            }
          }
          rawData = { attainment, examSummaries: summaries };
        } else if (scopeType === 'department') {
          if (!activeSemesterId) {
            throw new ValidationError({ semesterId: 'Active semester could not be resolved for department root-cause report' });
          }
          rawData = await executeTool('get_department_attainment', { deptId: scopeId, semesterId: activeSemesterId }, userId, role, departmentScope);
        } else if (scopeType === 'batch') {
          if (!activeSemesterId) {
            throw new ValidationError({ semesterId: 'Active semester could not be resolved for batch root-cause report' });
          }
          rawData = await executeTool('get_batch_attainment', { batchId: scopeId, semesterId: activeSemesterId }, userId, role, departmentScope);
        } else {
          throw new ValidationError({ scopeType: `Unsupported scopeType '${scopeType}' for root-cause analysis` });
        }
      } else if (type === 'improvement') {
        if (scopeType === 'offering') {
          rawData = await executeTool('get_offering_attainment', { offeringId: scopeId }, userId, role, departmentScope);
        } else if (scopeType === 'student') {
          rawData = await executeTool('get_student_marks', { studentId: scopeId }, userId, role, departmentScope);
        } else if (scopeType === 'department') {
          if (!activeSemesterId) {
            throw new ValidationError({ semesterId: 'Active semester could not be resolved for department improvement recommendations' });
          }
          rawData = await executeTool('get_department_attainment', { deptId: scopeId, semesterId: activeSemesterId }, userId, role, departmentScope);
        } else if (scopeType === 'batch') {
          if (!activeSemesterId) {
            throw new ValidationError({ semesterId: 'Active semester could not be resolved for batch improvement recommendations' });
          }
          rawData = await executeTool('get_batch_attainment', { batchId: scopeId, semesterId: activeSemesterId }, userId, role, departmentScope);
        } else {
          throw new ValidationError({ scopeType: `Unsupported scopeType '${scopeType}' for improvement recommendations` });
        }
      } else if (type === 'career-advisory' && scopeType === 'student') {
        const enrollments = await executeTool('get_student_enrollments', { studentId: scopeId }, userId, role, departmentScope);
        const marks = await executeTool('get_student_marks', { studentId: scopeId }, userId, role, departmentScope);
        rawData = { enrollments, marks };
      } else if (type === 'performance' && scopeType === 'student') {
        rawData = await executeTool('get_student_marks', { studentId: scopeId }, userId, role, departmentScope);
      } else {
        throw new ValidationError({ type: `Unsupported analysis combination: type=${type}, scopeType=${scopeType}` });
      }

      // 2. Anonymize if required
      const anonymizer = new AIAnonymizer();
      const shouldAnonymize = AIAnonymizer.shouldAnonymize(role);
      
      let finalData = rawData;
      if (shouldAnonymize) {
        const rawArray = Array.isArray(rawData) ? rawData : [rawData];
        const { anonymized } = anonymizer.anonymize(rawArray);
        finalData = Array.isArray(rawData) ? anonymized : anonymized[0];
      }

      // 3. Build prompts
      const userStatus = await AIKeyService.getKeyStatus(userId);
      const preferredModel = userStatus.preferredModel || env.AI_DEFAULT_MODEL;
      const systemPrompt = await this.buildSystemPrompt(role, departmentScope);
      
      let analysisPrompt = '';
      switch (type) {
        case 'at-risk':
          analysisPrompt = `Generate a comprehensive report identifying at-risk students and recommending pedagogical interventions based on this data:\n${JSON.stringify(finalData)}`;
          break;
        case 'root-cause':
          analysisPrompt = `Perform a root-cause analysis on course offering attainment results. Outline potential reasons for low attainment in specific outcomes and match these to Bloom taxonomy levels:\n${JSON.stringify(finalData)}`;
          break;
        case 'improvement':
          analysisPrompt = `Produce a structured set of improvement recommendations based on the attainment and performance details:\n${JSON.stringify(finalData)}`;
          break;
        case 'career-advisory':
          analysisPrompt = `Generate a personalized career advisory report matching the student's learning outcomes, strengths, and weaknesses to industry paths, certificates, and job roles:\n${JSON.stringify(finalData)}`;
          break;
        case 'performance':
          analysisPrompt = `Develop a detailed academic performance analysis identifying core strengths, weaknesses, and attainment trends:\n${JSON.stringify(finalData)}`;
          break;
      }

      // 4. Request from OpenRouter
      const response = await axios.post(
        OPENROUTER_COMPLETIONS_URL,
        {
          model: preferredModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: analysisPrompt }
          ],
          stream: false
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://github.com/realSalman/Synapse-AI-Task-Manager',
            'X-Title': 'AtlasAI',
            'Content-Type': 'application/json',
          },
        }
      );

      const aiText = response.data?.choices?.[0]?.message?.content || '';
      
      // 5. De-anonymize the final response
      let resultReport = aiText;
      if (shouldAnonymize) {
        resultReport = anonymizer.deAnonymize(aiText);
      }
      
      return resultReport;
    });

    return { content, cached: wasCached };
  }
}
