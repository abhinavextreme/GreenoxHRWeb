import { EMPLOYMENT_STATUS, ROLES } from '../../constants/index.js';

export function canHr(role) {
  return role === ROLES.hrAdmin || role === ROLES.superAdmin;
}

export function canReview(role) {
  return canHr(role) || role === ROLES.outletManager;
}

export function canSelfPunch(session) {
  const role = session?.user?.role;
  return (role === ROLES.employee || role === ROLES.hrAdmin) && session?.employee?.status === EMPLOYMENT_STATUS.active;
}
