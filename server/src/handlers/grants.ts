import { db } from '../db';
import { grantsTable, organizationsTable } from '../db/schema';
import { type CreateGrantInput, type UpdateGrantInput, type Grant, type FilterInput } from '../schema';
import { eq, and, count, desc, ilike, SQL } from 'drizzle-orm';

export async function createGrant(input: CreateGrantInput): Promise<Grant> {
  try {
    // Validate that the organization exists and belongs to the same tenant
    const organization = await db.select()
      .from(organizationsTable)
      .where(
        and(
          eq(organizationsTable.id, input.organizationId),
          eq(organizationsTable.tenantId, input.tenantId)
        )
      )
      .execute();

    if (organization.length === 0) {
      throw new Error('Organization not found or does not belong to this tenant');
    }

    // Insert the grant
    const result = await db.insert(grantsTable)
      .values({
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        grantName: input.grantName,
        applicationDate: input.applicationDate,
        awardDate: input.awardDate,
        amount: input.amount.toString(),
        status: input.status,
        reportingRequirements: input.reportingRequirements,
        customFields: input.customFields,
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const grant = result[0];
    return {
      ...grant,
      amount: parseFloat(grant.amount),
      customFields: grant.customFields as Record<string, any> | null,
    };
  } catch (error) {
    console.error('Grant creation failed:', error);
    throw error;
  }
}

export async function getGrants(filter: FilterInput): Promise<{ grants: Grant[]; total: number }> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(grantsTable.tenantId, filter.tenantId)
    ];

    // Add search filter if provided
    if (filter.search) {
      conditions.push(
        ilike(grantsTable.grantName, `%${filter.search}%`)
      );
    }

    // Determine sort column and order
    let orderByClause;
    if (filter.sortBy === 'grantName') {
      orderByClause = filter.sortOrder === 'asc' 
        ? grantsTable.grantName
        : desc(grantsTable.grantName);
    } else if (filter.sortBy === 'amount') {
      orderByClause = filter.sortOrder === 'asc'
        ? grantsTable.amount
        : desc(grantsTable.amount);
    } else if (filter.sortBy === 'status') {
      orderByClause = filter.sortOrder === 'asc'
        ? grantsTable.status
        : desc(grantsTable.status);
    } else {
      // Default sort by created_at
      orderByClause = filter.sortOrder === 'asc'
        ? grantsTable.createdAt
        : desc(grantsTable.createdAt);
    }

    // Calculate pagination
    const offset = (filter.page - 1) * filter.limit;

    // Execute main query with all clauses
    const results = await db.select()
      .from(grantsTable)
      .innerJoin(organizationsTable, eq(grantsTable.organizationId, organizationsTable.id))
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(filter.limit)
      .offset(offset)
      .execute();

    // Get total count for pagination
    const totalResult = await db.select({ count: count() })
      .from(grantsTable)
      .where(and(...conditions))
      .execute();
    
    const total = totalResult[0].count;

    // Transform results and convert numeric fields
    const grants: Grant[] = results.map(result => ({
      ...result.grants,
      amount: parseFloat(result.grants.amount),
      customFields: result.grants.customFields as Record<string, any> | null,
    }));

    return { grants, total };
  } catch (error) {
    console.error('Getting grants failed:', error);
    throw error;
  }
}

export async function getGrantById(id: number, tenantId: string): Promise<Grant | null> {
  try {
    const results = await db.select()
      .from(grantsTable)
      .innerJoin(organizationsTable, eq(grantsTable.organizationId, organizationsTable.id))
      .where(
        and(
          eq(grantsTable.id, id),
          eq(grantsTable.tenantId, tenantId)
        )
      )
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const grant = results[0].grants;
    return {
      ...grant,
      amount: parseFloat(grant.amount),
      customFields: grant.customFields as Record<string, any> | null,
    };
  } catch (error) {
    console.error('Getting grant by ID failed:', error);
    throw error;
  }
}

export async function updateGrant(input: UpdateGrantInput, tenantId: string): Promise<Grant> {
  try {
    // First check that the grant exists and belongs to the tenant
    const existingGrant = await db.select()
      .from(grantsTable)
      .where(
        and(
          eq(grantsTable.id, input.id),
          eq(grantsTable.tenantId, tenantId)
        )
      )
      .execute();

    if (existingGrant.length === 0) {
      throw new Error('Grant not found or does not belong to this tenant');
    }

    // If organizationId is being updated, validate it belongs to the same tenant
    if (input.organizationId) {
      const organization = await db.select()
        .from(organizationsTable)
        .where(
          and(
            eq(organizationsTable.id, input.organizationId),
            eq(organizationsTable.tenantId, tenantId)
          )
        )
        .execute();

      if (organization.length === 0) {
        throw new Error('Organization not found or does not belong to this tenant');
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (input.organizationId !== undefined) {
      updateData.organizationId = input.organizationId;
    }
    if (input.grantName !== undefined) {
      updateData.grantName = input.grantName;
    }
    if (input.applicationDate !== undefined) {
      updateData.applicationDate = input.applicationDate;
    }
    if (input.awardDate !== undefined) {
      updateData.awardDate = input.awardDate;
    }
    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString();
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.reportingRequirements !== undefined) {
      updateData.reportingRequirements = input.reportingRequirements;
    }
    if (input.customFields !== undefined) {
      updateData.customFields = input.customFields;
    }

    // Update the grant
    const result = await db.update(grantsTable)
      .set(updateData)
      .where(
        and(
          eq(grantsTable.id, input.id),
          eq(grantsTable.tenantId, tenantId)
        )
      )
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const grant = result[0];
    return {
      ...grant,
      amount: parseFloat(grant.amount),
      customFields: grant.customFields as Record<string, any> | null,
    };
  } catch (error) {
    console.error('Grant update failed:', error);
    throw error;
  }
}

export async function deleteGrant(id: number, tenantId: string): Promise<void> {
  try {
    // First check that the grant exists and belongs to the tenant
    const existingGrant = await db.select()
      .from(grantsTable)
      .where(
        and(
          eq(grantsTable.id, id),
          eq(grantsTable.tenantId, tenantId)
        )
      )
      .execute();

    if (existingGrant.length === 0) {
      throw new Error('Grant not found or does not belong to this tenant');
    }

    // Delete the grant
    await db.delete(grantsTable)
      .where(
        and(
          eq(grantsTable.id, id),
          eq(grantsTable.tenantId, tenantId)
        )
      )
      .execute();
  } catch (error) {
    console.error('Grant deletion failed:', error);
    throw error;
  }
}

export async function getGrantsByOrganization(organizationId: number, tenantId: string): Promise<Grant[]> {
  try {
    // Validate that the organization belongs to the tenant
    const organization = await db.select()
      .from(organizationsTable)
      .where(
        and(
          eq(organizationsTable.id, organizationId),
          eq(organizationsTable.tenantId, tenantId)
        )
      )
      .execute();

    if (organization.length === 0) {
      throw new Error('Organization not found or does not belong to this tenant');
    }

    // Get all grants for the organization
    const results = await db.select()
      .from(grantsTable)
      .where(
        and(
          eq(grantsTable.organizationId, organizationId),
          eq(grantsTable.tenantId, tenantId)
        )
      )
      .orderBy(desc(grantsTable.createdAt))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(grant => ({
      ...grant,
      amount: parseFloat(grant.amount),
      customFields: grant.customFields as Record<string, any> | null,
    }));
  } catch (error) {
    console.error('Getting grants by organization failed:', error);
    throw error;
  }
}