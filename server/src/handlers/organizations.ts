import { db } from '../db';
import { organizationsTable } from '../db/schema';
import { type CreateOrganizationInput, type UpdateOrganizationInput, type Organization, type FilterInput } from '../schema';
import { eq, and, ilike, count, desc, asc, or } from 'drizzle-orm';

export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
  try {
    const result = await db.insert(organizationsTable)
      .values({
        tenantId: input.tenantId,
        name: input.name,
        contactPerson: input.contactPerson,
        email: input.email,
        phone: input.phone,
        address: input.address,
        type: input.type,
        notes: input.notes,
        customFields: input.customFields as any,
      })
      .returning()
      .execute();

    return result[0] as Organization;
  } catch (error) {
    console.error('Organization creation failed:', error);
    throw error;
  }
}

export async function getOrganizations(filter: FilterInput): Promise<{ organizations: Organization[]; total: number }> {
  try {
    // Build where conditions
    const conditions = [eq(organizationsTable.tenantId, filter.tenantId)];

    if (filter.search) {
      const searchCondition = or(
        ilike(organizationsTable.name, `%${filter.search}%`),
        ilike(organizationsTable.contactPerson, `%${filter.search}%`),
        ilike(organizationsTable.email, `%${filter.search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);

    // Execute count query
    const totalResult = await db.select({ count: count() })
      .from(organizationsTable)
      .where(whereCondition)
      .execute();

    // Determine sort order
    let orderByClause;
    if (filter.sortBy === 'name') {
      orderByClause = filter.sortOrder === 'asc' ? asc(organizationsTable.name) : desc(organizationsTable.name);
    } else if (filter.sortBy === 'contactPerson') {
      orderByClause = filter.sortOrder === 'asc' ? asc(organizationsTable.contactPerson) : desc(organizationsTable.contactPerson);
    } else if (filter.sortBy === 'email') {
      orderByClause = filter.sortOrder === 'asc' ? asc(organizationsTable.email) : desc(organizationsTable.email);
    } else if (filter.sortBy === 'type') {
      orderByClause = filter.sortOrder === 'asc' ? asc(organizationsTable.type) : desc(organizationsTable.type);
    } else if (filter.sortBy === 'createdAt') {
      orderByClause = filter.sortOrder === 'asc' ? asc(organizationsTable.createdAt) : desc(organizationsTable.createdAt);
    } else {
      orderByClause = desc(organizationsTable.createdAt);
    }

    // Apply pagination
    const offset = (filter.page - 1) * filter.limit;

    // Execute main query with all conditions at once
    const organizations = await db.select()
      .from(organizationsTable)
      .where(whereCondition)
      .orderBy(orderByClause)
      .limit(filter.limit)
      .offset(offset)
      .execute();

    return {
      organizations: organizations as Organization[],
      total: totalResult[0].count as number,
    };
  } catch (error) {
    console.error('Get organizations failed:', error);
    throw error;
  }
}

export async function getOrganizationById(id: number, tenantId: string): Promise<Organization | null> {
  try {
    const result = await db.select()
      .from(organizationsTable)
      .where(and(
        eq(organizationsTable.id, id),
        eq(organizationsTable.tenantId, tenantId)
      ))
      .execute();

    if (result.length === 0) {
      return null;
    }

    return result[0] as Organization;
  } catch (error) {
    console.error('Get organization by ID failed:', error);
    throw error;
  }
}

export async function updateOrganization(input: UpdateOrganizationInput, tenantId: string): Promise<Organization> {
  try {
    // First check if organization exists and belongs to tenant
    const existing = await getOrganizationById(input.id, tenantId);
    if (!existing) {
      throw new Error(`Organization with ID ${input.id} not found for tenant ${tenantId}`);
    }

    // Build update object with only provided fields
    const updateData: any = { updatedAt: new Date() };
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.contactPerson !== undefined) updateData.contactPerson = input.contactPerson;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.customFields !== undefined) updateData.customFields = input.customFields as any;

    const result = await db.update(organizationsTable)
      .set(updateData)
      .where(and(
        eq(organizationsTable.id, input.id),
        eq(organizationsTable.tenantId, tenantId)
      ))
      .returning()
      .execute();

    return result[0] as Organization;
  } catch (error) {
    console.error('Organization update failed:', error);
    throw error;
  }
}

export async function deleteOrganization(id: number, tenantId: string): Promise<void> {
  try {
    // Check if organization exists and belongs to tenant
    const existing = await getOrganizationById(id, tenantId);
    if (!existing) {
      throw new Error(`Organization with ID ${id} not found for tenant ${tenantId}`);
    }

    await db.delete(organizationsTable)
      .where(and(
        eq(organizationsTable.id, id),
        eq(organizationsTable.tenantId, tenantId)
      ))
      .execute();
  } catch (error) {
    console.error('Organization deletion failed:', error);
    throw error;
  }
}