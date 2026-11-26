export const LEAVE_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
};

export const LEAVE_STATUSES = [
  LEAVE_STATUS.pending,
  LEAVE_STATUS.approved,
  LEAVE_STATUS.rejected,
  LEAVE_STATUS.cancelled,
];

export const LEAVE_STATUS_LABELS = {
  [LEAVE_STATUS.pending]: 'Pending',
  [LEAVE_STATUS.approved]: 'Approved',
  [LEAVE_STATUS.rejected]: 'Rejected',
  [LEAVE_STATUS.cancelled]: 'Cancelled',
};

export const CASUAL_LEAVE_CODE = 'CASUAL';
