import mongoose from 'mongoose';
import connectDB from '../config/db';
import { ExamModel } from '../modules/exam/exam.model';
import { logger } from '../core/utils/logger';

const migrate = async () => {
  try {
    await connectDB();
    logger.info('Connected to MongoDB for question CO migration...');

    const exams = await ExamModel.find({});
    logger.info(`Found ${exams.length} exams to check/migrate.`);

    let migratedCount = 0;

    for (const exam of exams) {
      let changed = false;
      const questionsObj = exam.toObject();

      const updatedQuestions = exam.questions.map((q: any) => {
        // Check if old 'co' field exists and coMapping does not
        const oldCo = q.toObject ? q.toObject().co : q.co;
        const currentCoMapping = q.coMapping;

        if (oldCo && (!currentCoMapping || currentCoMapping.length === 0)) {
          changed = true;
          return {
            number: q.number,
            marks: q.marks,
            coMapping: [{ co: oldCo, percentage: 100 }]
          };
        }
        return q;
      });

      if (changed) {
        exam.questions = updatedQuestions;
        // The pre-save hook will automatically compute cosCovered
        await exam.save();
        migratedCount++;
        logger.info(`Migrated exam: ${exam.name} (${exam._id})`);
      }
    }

    logger.info(`Migration completed. Migrated ${migratedCount} exams.`);
    mongoose.connection.close();
  } catch (error) {
    logger.error(error, 'Error during migration');
    mongoose.connection.close();
    process.exit(1);
  }
};

migrate();
