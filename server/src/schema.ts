import { z } from 'zod';

// Base tenant ID schema for multi-tenancy
export const tenantIdSchema = z.string().uuid();

// Common contact information schema
export const contactInfoSchema = z.object({
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
});

// Custom fields schema for JSONB data
export const customFieldsSchema = z.record(z.any()).nullable();

// Donor schema
export const donorSchema = z.object({
  id: z.number(),
  tenantId: z.string().uuid(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  customFields: customFieldsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Donor = z.infer<typeof donorSchema>;

export const createDonorInputSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  customFields: customFieldsSchema,
});

export type CreateDonorInput = z.infer<typeof createDonorInputSchema>;

export const updateDonorInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  customFields: customFieldsSchema.optional(),
});

export type UpdateDonorInput = z.infer<typeof updateDonorInputSchema>;

// Campaign schema
export const campaignStatusSchema = z.enum(['Active', 'Completed', 'Cancelled', 'Planned']);

export const campaignSchema = z.object({
  id: z.number(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  goalAmount: z.number(),
  currentAmountRaised: z.number(),
  status: campaignStatusSchema,
  customFields: customFieldsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Campaign = z.infer<typeof campaignSchema>;

export const createCampaignInputSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  goalAmount: z.number().nonnegative(),
  status: campaignStatusSchema,
  customFields: customFieldsSchema,
});

export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;

export const updateCampaignInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  goalAmount: z.number().nonnegative().optional(),
  currentAmountRaised: z.number().nonnegative().optional(),
  status: campaignStatusSchema.optional(),
  customFields: customFieldsSchema.optional(),
});

export type UpdateCampaignInput = z.infer<typeof updateCampaignInputSchema>;

// Donation/Pledge schema
export const donationStatusSchema = z.enum(['Pledged', 'Received', 'Cancelled', 'Refunded']);
export const paymentMethodSchema = z.enum(['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'Online', 'Other']);

export const donationSchema = z.object({
  id: z.number(),
  tenantId: z.string().uuid(),
  donorId: z.number(),
  campaignId: z.number().nullable(),
  amount: z.number(),
  date: z.coerce.date(),
  status: donationStatusSchema,
  paymentMethod: paymentMethodSchema.nullable(),
  notes: z.string().nullable(),
  customFields: customFieldsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Donation = z.infer<typeof donationSchema>;

export const createDonationInputSchema = z.object({
  tenantId: z.string().uuid(),
  donorId: z.number(),
  campaignId: z.number().nullable(),
  amount: z.number().positive(),
  date: z.coerce.date(),
  status: donationStatusSchema,
  paymentMethod: paymentMethodSchema.nullable(),
  notes: z.string().nullable(),
  customFields: customFieldsSchema,
});

export type CreateDonationInput = z.infer<typeof createDonationInputSchema>;

export const updateDonationInputSchema = z.object({
  id: z.number(),
  donorId: z.number().optional(),
  campaignId: z.number().nullable().optional(),
  amount: z.number().positive().optional(),
  date: z.coerce.date().optional(),
  status: donationStatusSchema.optional(),
  paymentMethod: paymentMethodSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  customFields: customFieldsSchema.optional(),
});

export type UpdateDonationInput = z.infer<typeof updateDonationInputSchema>;

// Volunteer schema
export const volunteerSchema = z.object({
  id: z.number(),
  tenantId: z.string().uuid(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  skills: z.string().nullable(),
  availability: z.string().nullable(),
  notes: z.string().nullable(),
  customFields: customFieldsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Volunteer = z.infer<typeof volunteerSchema>;

export const createVolunteerInputSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  skills: z.string().nullable(),
  availability: z.string().nullable(),
  notes: z.string().nullable(),
  customFields: customFieldsSchema,
});

export type CreateVolunteerInput = z.infer<typeof createVolunteerInputSchema>;

export const updateVolunteerInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  skills: z.string().nullable().optional(),
  availability: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  customFields: customFieldsSchema.optional(),
});

export type UpdateVolunteerInput = z.infer<typeof updateVolunteerInputSchema>;

// Event schema
export const eventSchema = z.object({
  id: z.number(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  date: z.coerce.date(),
  location: z.string().nullable(),
  capacity: z.number().int().nullable(),
  customFields: customFieldsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Event = z.infer<typeof eventSchema>;

export const createEventInputSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  date: z.coerce.date(),
  location: z.string().nullable(),
  capacity: z.number().int().nonnegative().nullable(),
  customFields: customFieldsSchema,
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

export const updateEventInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  date: z.coerce.date().optional(),
  location: z.string().nullable().optional(),
  capacity: z.number().int().nonnegative().nullable().optional(),
  customFields: customFieldsSchema.optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;

// Organization schema
export const organizationTypeSchema = z.enum(['Grant Maker', 'Sponsor', 'Corporate Partner', 'Foundation', 'Government', 'Other']);

export const organizationSchema = z.object({
  id: z.number(),
  tenantId: z.string().uuid(),
  name: z.string(),
  contactPerson: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  type: organizationTypeSchema,
  notes: z.string().nullable(),
  customFields: customFieldsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Organization = z.infer<typeof organizationSchema>;

export const createOrganizationInputSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  contactPerson: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  type: organizationTypeSchema,
  notes: z.string().nullable(),
  customFields: customFieldsSchema,
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;

export const updateOrganizationInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  contactPerson: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  type: organizationTypeSchema.optional(),
  notes: z.string().nullable().optional(),
  customFields: customFieldsSchema.optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationInputSchema>;

// Grant schema
export const grantStatusSchema = z.enum(['Applied', 'Under Review', 'Awarded', 'Declined', 'Completed', 'Cancelled']);

export const grantSchema = z.object({
  id: z.number(),
  tenantId: z.string().uuid(),
  organizationId: z.number(),
  grantName: z.string(),
  applicationDate: z.coerce.date().nullable(),
  awardDate: z.coerce.date().nullable(),
  amount: z.number(),
  status: grantStatusSchema,
  reportingRequirements: z.string().nullable(),
  customFields: customFieldsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Grant = z.infer<typeof grantSchema>;

export const createGrantInputSchema = z.object({
  tenantId: z.string().uuid(),
  organizationId: z.number(),
  grantName: z.string().min(1),
  applicationDate: z.coerce.date().nullable(),
  awardDate: z.coerce.date().nullable(),
  amount: z.number().nonnegative(),
  status: grantStatusSchema,
  reportingRequirements: z.string().nullable(),
  customFields: customFieldsSchema,
});

export type CreateGrantInput = z.infer<typeof createGrantInputSchema>;

export const updateGrantInputSchema = z.object({
  id: z.number(),
  organizationId: z.number().optional(),
  grantName: z.string().min(1).optional(),
  applicationDate: z.coerce.date().nullable().optional(),
  awardDate: z.coerce.date().nullable().optional(),
  amount: z.number().nonnegative().optional(),
  status: grantStatusSchema.optional(),
  reportingRequirements: z.string().nullable().optional(),
  customFields: customFieldsSchema.optional(),
});

export type UpdateGrantInput = z.infer<typeof updateGrantInputSchema>;

// Event Attendee schema (junction table for Events with Donors/Volunteers)
export const attendeeTypeSchema = z.enum(['Donor', 'Volunteer']);

export const eventAttendeeSchema = z.object({
  id: z.number(),
  tenantId: z.string().uuid(),
  eventId: z.number(),
  attendeeId: z.number(),
  attendeeType: attendeeTypeSchema,
  createdAt: z.coerce.date(),
});

export type EventAttendee = z.infer<typeof eventAttendeeSchema>;

export const createEventAttendeeInputSchema = z.object({
  tenantId: z.string().uuid(),
  eventId: z.number(),
  attendeeId: z.number(),
  attendeeType: attendeeTypeSchema,
});

export type CreateEventAttendeeInput = z.infer<typeof createEventAttendeeInputSchema>;

// Custom Data schema for generic custom data entity
export const customDataSchema = z.object({
  id: z.number(),
  tenantId: z.string().uuid(),
  dataType: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  data: z.record(z.any()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CustomData = z.infer<typeof customDataSchema>;

export const createCustomDataInputSchema = z.object({
  tenantId: z.string().uuid(),
  dataType: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  data: z.record(z.any()),
});

export type CreateCustomDataInput = z.infer<typeof createCustomDataInputSchema>;

export const updateCustomDataInputSchema = z.object({
  id: z.number(),
  dataType: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  data: z.record(z.any()).optional(),
});

export type UpdateCustomDataInput = z.infer<typeof updateCustomDataInputSchema>;

// Pagination and filtering schemas
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const filterSchema = z.object({
  tenantId: z.string().uuid(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).merge(paginationSchema);

export type FilterInput = z.infer<typeof filterSchema>;