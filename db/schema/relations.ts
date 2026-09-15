import { relations } from "drizzle-orm";
import { user, account, session } from "./users";
import { organization, organizationMembership, invitation } from "./organizations";
import { role, permission, rolePermission } from "./rbac";
import { organizationBranding } from "./branding";
import { ticket, ticketEvent } from "./tickets";
import { ticketAttachment } from "./attachments";
import { auditEvent } from "./audit";
import { catalogItem, catalogOrder, serviceRequestApproval } from "./catalog";
import { knowledgeArticle, ticketKnowledgeLink } from "./knowledge";
import { organizationSlaSettings } from "./sla";

// User relations
export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  memberships: many(organizationMembership),
  ticketsRequested: many(ticket, { relationName: "requester" }),
  ticketsAssigned: many(ticket, { relationName: "assignee" }),
  ticketEvents: many(ticketEvent),
  auditEvents: many(auditEvent),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

// Organization relations
export const organizationRelations = relations(organization, ({ many, one }) => ({
  memberships: many(organizationMembership),
  invitations: many(invitation),
  branding: one(organizationBranding),
  tickets: many(ticket),
  auditEvents: many(auditEvent),
  roles: many(role),
  catalogItems: many(catalogItem),
  knowledgeArticles: many(knowledgeArticle),
  slaSettings: one(organizationSlaSettings),
}));

export const organizationMembershipRelations = relations(
  organizationMembership,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationMembership.organizationId],
      references: [organization.id],
    }),
    user: one(user, {
      fields: [organizationMembership.userId],
      references: [user.id],
    }),
    role: one(role, {
      fields: [organizationMembership.roleId],
      references: [role.id],
    }),
  })
);

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  role: one(role, {
    fields: [invitation.roleId],
    references: [role.id],
  }),
  inviter: one(user, {
    fields: [invitation.invitedBy],
    references: [user.id],
  }),
}));

// RBAC relations
export const roleRelations = relations(role, ({ many, one }) => ({
  organization: one(organization, {
    fields: [role.organizationId],
    references: [organization.id],
  }),
  memberships: many(organizationMembership),
  rolePermissions: many(rolePermission),
}));

export const permissionRelations = relations(permission, ({ many }) => ({
  rolePermissions: many(rolePermission),
}));

export const rolePermissionRelations = relations(rolePermission, ({ one }) => ({
  role: one(role, {
    fields: [rolePermission.roleId],
    references: [role.id],
  }),
  permission: one(permission, {
    fields: [rolePermission.permissionId],
    references: [permission.id],
  }),
}));

// Branding relations
export const organizationBrandingRelations = relations(organizationBranding, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationBranding.organizationId],
    references: [organization.id],
  }),
  updater: one(user, {
    fields: [organizationBranding.updatedBy],
    references: [user.id],
  }),
}));

// Ticket relations
export const ticketRelations = relations(ticket, ({ one, many }) => ({
  organization: one(organization, {
    fields: [ticket.organizationId],
    references: [organization.id],
  }),
  requester: one(user, {
    fields: [ticket.requesterId],
    references: [user.id],
    relationName: "requester",
  }),
  assignee: one(user, {
    fields: [ticket.assigneeId],
    references: [user.id],
    relationName: "assignee",
  }),
  events: many(ticketEvent),
  attachments: many(ticketAttachment),
  catalogOrders: many(catalogOrder),
  approvals: many(serviceRequestApproval),
  knowledgeLinks: many(ticketKnowledgeLink),
}));

export const ticketAttachmentRelations = relations(ticketAttachment, ({ one }) => ({
  organization: one(organization, {
    fields: [ticketAttachment.organizationId],
    references: [organization.id],
  }),
  ticket: one(ticket, {
    fields: [ticketAttachment.ticketId],
    references: [ticket.id],
  }),
  uploadedBy: one(user, {
    fields: [ticketAttachment.uploadedById],
    references: [user.id],
  }),
}));

export const ticketEventRelations = relations(ticketEvent, ({ one }) => ({
  organization: one(organization, {
    fields: [ticketEvent.organizationId],
    references: [organization.id],
  }),
  ticket: one(ticket, {
    fields: [ticketEvent.ticketId],
    references: [ticket.id],
  }),
  actor: one(user, {
    fields: [ticketEvent.actorId],
    references: [user.id],
  }),
}));

// Audit relations
export const catalogItemRelations = relations(catalogItem, ({ one, many }) => ({
  organization: one(organization, {
    fields: [catalogItem.organizationId],
    references: [organization.id],
  }),
  approver: one(user, {
    fields: [catalogItem.approverUserId],
    references: [user.id],
  }),
  orders: many(catalogOrder),
}));

export const catalogOrderRelations = relations(catalogOrder, ({ one }) => ({
  organization: one(organization, {
    fields: [catalogOrder.organizationId],
    references: [organization.id],
  }),
  catalogItem: one(catalogItem, {
    fields: [catalogOrder.catalogItemId],
    references: [catalogItem.id],
  }),
  ticket: one(ticket, {
    fields: [catalogOrder.ticketId],
    references: [ticket.id],
  }),
}));

export const serviceRequestApprovalRelations = relations(serviceRequestApproval, ({ one }) => ({
  organization: one(organization, {
    fields: [serviceRequestApproval.organizationId],
    references: [organization.id],
  }),
  ticket: one(ticket, {
    fields: [serviceRequestApproval.ticketId],
    references: [ticket.id],
  }),
  approver: one(user, {
    fields: [serviceRequestApproval.approverUserId],
    references: [user.id],
    relationName: "assignedApprover",
  }),
  decidedBy: one(user, {
    fields: [serviceRequestApproval.decidedById],
    references: [user.id],
    relationName: "approvalDecider",
  }),
}));

export const knowledgeArticleRelations = relations(knowledgeArticle, ({ one, many }) => ({
  organization: one(organization, {
    fields: [knowledgeArticle.organizationId],
    references: [organization.id],
  }),
  author: one(user, {
    fields: [knowledgeArticle.authorId],
    references: [user.id],
  }),
  ticketLinks: many(ticketKnowledgeLink),
}));

export const ticketKnowledgeLinkRelations = relations(ticketKnowledgeLink, ({ one }) => ({
  organization: one(organization, {
    fields: [ticketKnowledgeLink.organizationId],
    references: [organization.id],
  }),
  ticket: one(ticket, {
    fields: [ticketKnowledgeLink.ticketId],
    references: [ticket.id],
  }),
  article: one(knowledgeArticle, {
    fields: [ticketKnowledgeLink.articleId],
    references: [knowledgeArticle.id],
  }),
  linkedBy: one(user, {
    fields: [ticketKnowledgeLink.linkedById],
    references: [user.id],
  }),
  ticketEvent: one(ticketEvent, {
    fields: [ticketKnowledgeLink.ticketEventId],
    references: [ticketEvent.id],
  }),
}));

export const auditEventRelations = relations(auditEvent, ({ one }) => ({
  organization: one(organization, {
    fields: [auditEvent.organizationId],
    references: [organization.id],
  }),
  actor: one(user, {
    fields: [auditEvent.actorId],
    references: [user.id],
  }),
}));

export const organizationSlaSettingsRelations = relations(organizationSlaSettings, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationSlaSettings.organizationId],
    references: [organization.id],
  }),
  updatedByUser: one(user, {
    fields: [organizationSlaSettings.updatedBy],
    references: [user.id],
  }),
}));
