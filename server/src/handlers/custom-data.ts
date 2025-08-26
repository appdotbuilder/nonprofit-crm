import { db } from '../db';
import { customDataTable } from '../db/schema';
import { type CreateCustomDataInput, type UpdateCustomDataInput, type CustomData, type FilterInput } from '../schema';
import { eq, and, count, desc, asc, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function createCustomData(input: CreateCustomDataInput): Promise<CustomData> {
  try {
    const result = await db.insert(customDataTable)
      .values({
        tenantId: input.tenantId,
        dataType: input.dataType,
        name: input.name,
        description: input.description,
        data: input.data,
      })
      .returning()
      .execute();

    // Convert the result to match CustomData type
    const customData = result[0];
    return {
      ...customData,
      data: customData.data as Record<string, any>
    };
  } catch (error) {
    console.error('Custom data creation failed:', error);
    throw error;
  }
}

export async function getCustomData(filter: FilterInput): Promise<{ customData: CustomData[]; total: number }> {
  try {
    const { tenantId, search, sortBy, sortOrder, page, limit } = filter;
    const offset = (page - 1) * limit;

    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    conditions.push(eq(customDataTable.tenantId, tenantId));

    if (search) {
      conditions.push(
        sql`(${customDataTable.name} ILIKE ${'%' + search + '%'} OR ${customDataTable.dataType} ILIKE ${'%' + search + '%'} OR ${customDataTable.description} ILIKE ${'%' + search + '%'})`
      );
    }

    // Build the where condition
    const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);

    // Determine sort column and direction
    let orderByClause;
    if (sortBy === 'name') {
      orderByClause = sortOrder === 'asc' ? asc(customDataTable.name) : desc(customDataTable.name);
    } else if (sortBy === 'dataType') {
      orderByClause = sortOrder === 'asc' ? asc(customDataTable.dataType) : desc(customDataTable.dataType);
    } else if (sortBy === 'createdAt') {
      orderByClause = sortOrder === 'asc' ? asc(customDataTable.createdAt) : desc(customDataTable.createdAt);
    } else if (sortBy === 'updatedAt') {
      orderByClause = sortOrder === 'asc' ? asc(customDataTable.updatedAt) : desc(customDataTable.updatedAt);
    } else {
      // Default sort by createdAt desc
      orderByClause = desc(customDataTable.createdAt);
    }

    // Execute main query
    const results = await db.select()
      .from(customDataTable)
      .where(whereCondition)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)
      .execute();

    // Execute count query
    const totalResult = await db.select({ count: count() })
      .from(customDataTable)
      .where(whereCondition)
      .execute();

    // Convert results to match CustomData type
    const customData = results.map(result => ({
      ...result,
      data: result.data as Record<string, any>
    }));

    return {
      customData,
      total: totalResult[0].count
    };
  } catch (error) {
    console.error('Custom data retrieval failed:', error);
    throw error;
  }
}

export async function getCustomDataById(id: number, tenantId: string): Promise<CustomData | null> {
  try {
    const result = await db.select()
      .from(customDataTable)
      .where(
        and(
          eq(customDataTable.id, id),
          eq(customDataTable.tenantId, tenantId)
        )
      )
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert result to match CustomData type
    const customData = result[0];
    return {
      ...customData,
      data: customData.data as Record<string, any>
    };
  } catch (error) {
    console.error('Custom data retrieval by ID failed:', error);
    throw error;
  }
}

export async function updateCustomData(input: UpdateCustomDataInput, tenantId: string): Promise<CustomData> {
  try {
    // Build update object with only defined fields
    const updateData: Record<string, any> = {
      updatedAt: sql`NOW()`
    };

    if (input.dataType !== undefined) {
      updateData['dataType'] = input.dataType;
    }
    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    if (input.description !== undefined) {
      updateData['description'] = input.description;
    }
    if (input.data !== undefined) {
      updateData['data'] = input.data;
    }

    const result = await db.update(customDataTable)
      .set(updateData)
      .where(
        and(
          eq(customDataTable.id, input.id),
          eq(customDataTable.tenantId, tenantId)
        )
      )
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Custom data not found or access denied');
    }

    // Convert result to match CustomData type
    const customData = result[0];
    return {
      ...customData,
      data: customData.data as Record<string, any>
    };
  } catch (error) {
    console.error('Custom data update failed:', error);
    throw error;
  }
}

export async function deleteCustomData(id: number, tenantId: string): Promise<void> {
  try {
    const result = await db.delete(customDataTable)
      .where(
        and(
          eq(customDataTable.id, id),
          eq(customDataTable.tenantId, tenantId)
        )
      )
      .returning({ id: customDataTable.id })
      .execute();

    if (result.length === 0) {
      throw new Error('Custom data not found or access denied');
    }
  } catch (error) {
    console.error('Custom data deletion failed:', error);
    throw error;
  }
}

export async function getCustomDataByType(dataType: string, tenantId: string): Promise<CustomData[]> {
  try {
    const result = await db.select()
      .from(customDataTable)
      .where(
        and(
          eq(customDataTable.dataType, dataType),
          eq(customDataTable.tenantId, tenantId)
        )
      )
      .orderBy(desc(customDataTable.createdAt))
      .execute();

    // Convert results to match CustomData type
    return result.map(customData => ({
      ...customData,
      data: customData.data as Record<string, any>
    }));
  } catch (error) {
    console.error('Custom data retrieval by type failed:', error);
    throw error;
  }
}