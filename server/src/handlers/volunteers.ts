import { db } from '../db';
import { volunteersTable } from '../db/schema';
import { type CreateVolunteerInput, type UpdateVolunteerInput, type Volunteer, type FilterInput } from '../schema';
import { eq, and, or, ilike, count, desc, asc, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function createVolunteer(input: CreateVolunteerInput): Promise<Volunteer> {
  try {
    const result = await db.insert(volunteersTable)
      .values({
        tenantId: input.tenantId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        skills: input.skills,
        availability: input.availability,
        notes: input.notes,
        customFields: input.customFields,
      })
      .returning()
      .execute();

    const volunteer = result[0];
    return {
      ...volunteer,
      customFields: volunteer.customFields as Record<string, any> | null
    };
  } catch (error) {
    console.error('Volunteer creation failed:', error);
    throw error;
  }
}

export async function getVolunteers(filter: FilterInput): Promise<{ volunteers: Volunteer[]; total: number }> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by tenant
    conditions.push(eq(volunteersTable.tenantId, filter.tenantId));

    // Add search filter if provided
    if (filter.search) {
      const searchPattern = `%${filter.search}%`;
      conditions.push(
        or(
          ilike(volunteersTable.name, searchPattern),
          ilike(volunteersTable.email, searchPattern),
          ilike(volunteersTable.phone, searchPattern),
          ilike(volunteersTable.skills, searchPattern)
        )!
      );
    }

    // Build the where clause
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    // Determine sort order
    let orderByClause;
    if (filter.sortBy) {
      // Define valid sortable columns
      const validSortColumns = {
        id: volunteersTable.id,
        name: volunteersTable.name,
        email: volunteersTable.email,
        phone: volunteersTable.phone,
        createdAt: volunteersTable.createdAt,
        updatedAt: volunteersTable.updatedAt,
      } as const;
      
      const sortColumn = validSortColumns[filter.sortBy as keyof typeof validSortColumns];
      if (sortColumn) {
        orderByClause = filter.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
      } else {
        orderByClause = desc(volunteersTable.createdAt);
      }
    } else {
      orderByClause = desc(volunteersTable.createdAt);
    }

    // Calculate pagination
    const offset = (filter.page - 1) * filter.limit;

    // Execute both queries with complete query building
    const [volunteers, totalResult] = await Promise.all([
      db.select()
        .from(volunteersTable)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(filter.limit)
        .offset(offset)
        .execute(),
      db.select({ count: count() })
        .from(volunteersTable)
        .where(whereClause)
        .execute()
    ]);

    return {
      volunteers: volunteers.map(volunteer => ({
        ...volunteer,
        customFields: volunteer.customFields as Record<string, any> | null
      })),
      total: totalResult[0].count
    };
  } catch (error) {
    console.error('Getting volunteers failed:', error);
    throw error;
  }
}

export async function getVolunteerById(id: number, tenantId: string): Promise<Volunteer | null> {
  try {
    const result = await db.select()
      .from(volunteersTable)
      .where(and(
        eq(volunteersTable.id, id),
        eq(volunteersTable.tenantId, tenantId)
      ))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const volunteer = result[0];
    return {
      ...volunteer,
      customFields: volunteer.customFields as Record<string, any> | null
    };
  } catch (error) {
    console.error('Getting volunteer by ID failed:', error);
    throw error;
  }
}

export async function updateVolunteer(input: UpdateVolunteerInput, tenantId: string): Promise<Volunteer> {
  try {
    // First verify the volunteer exists and belongs to the tenant
    const existingVolunteer = await getVolunteerById(input.id, tenantId);
    if (!existingVolunteer) {
      throw new Error('Volunteer not found');
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof volunteersTable.$inferInsert> = {
      updatedAt: new Date()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.skills !== undefined) updateData.skills = input.skills;
    if (input.availability !== undefined) updateData.availability = input.availability;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.customFields !== undefined) updateData.customFields = input.customFields;

    const result = await db.update(volunteersTable)
      .set(updateData)
      .where(and(
        eq(volunteersTable.id, input.id),
        eq(volunteersTable.tenantId, tenantId)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Volunteer not found or update failed');
    }

    const volunteer = result[0];
    return {
      ...volunteer,
      customFields: volunteer.customFields as Record<string, any> | null
    };
  } catch (error) {
    console.error('Volunteer update failed:', error);
    throw error;
  }
}

export async function deleteVolunteer(id: number, tenantId: string): Promise<void> {
  try {
    // First verify the volunteer exists and belongs to the tenant
    const existingVolunteer = await getVolunteerById(id, tenantId);
    if (!existingVolunteer) {
      throw new Error('Volunteer not found');
    }

    await db.delete(volunteersTable)
      .where(and(
        eq(volunteersTable.id, id),
        eq(volunteersTable.tenantId, tenantId)
      ))
      .execute();
  } catch (error) {
    console.error('Volunteer deletion failed:', error);
    throw error;
  }
}