import { Model, Query } from 'mongoose';
import { PaginationMeta } from '../types/response';

export class QueryBuilder<T> {
  public query: Query<any, any>;
  private model: Model<T>;
  private queryParams: Record<string, any>;
  private filterQuery: Record<string, any> = {};

  constructor(model: Model<T>, queryParams: Record<string, any>) {
    this.model = model;
    this.queryParams = queryParams;
    this.query = model.find();
  }

  filter(excludeFields: string[] = []): this {
    const queryObj = { ...this.queryParams };
    const baseExclude = ['page', 'limit', 'sort', 'fields', 'search'];
    const fieldsToExclude = [...baseExclude, ...excludeFields];
    
    fieldsToExclude.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    
    const parsedFilters = JSON.parse(queryStr);
    this.filterQuery = { ...this.filterQuery, ...parsedFilters };
    
    this.query = this.query.find(this.filterQuery);
    return this;
  }

  search(fields: string[]): this {
    if (this.queryParams.search && fields.length > 0) {
      const searchRegex = { $regex: this.queryParams.search, $options: 'i' };
      const orConditions = fields.map((field) => ({ [field]: searchRegex }));
      
      if (this.filterQuery.$or) {
        const existingOr = this.filterQuery.$or;
        delete this.filterQuery.$or;
        this.filterQuery.$and = [...(this.filterQuery.$and || []), { $or: existingOr }, { $or: orConditions }];
      } else {
        this.filterQuery.$or = orConditions;
      }
      this.query = this.query.find(this.filterQuery);
    }
    return this;
  }

  sort(): this {
    if (this.queryParams.sort) {
      const sortBy = (this.queryParams.sort as string).split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  select(): this {
    if (this.queryParams.fields) {
      const fields = (this.queryParams.fields as string).split(',').join(' ');
      this.query = this.query.select(fields);
    }
    return this;
  }

  populate(path: any, select?: string): this {
    if (select !== undefined) {
      this.query = this.query.populate(path, select);
    } else {
      this.query = this.query.populate(path);
    }
    return this;
  }

  async paginate(): Promise<{ data: T[]; meta: PaginationMeta }> {
    const page = parseInt(this.queryParams.page, 10) || 1;
    const limit = Math.min(parseInt(this.queryParams.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const data = await this.query.skip(skip).limit(limit).lean();
    const total = await this.model.countDocuments(this.filterQuery);
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as T[],
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}
