export const ROLES = {
  employee: 'employee',
  outletManager: 'outlet_manager',
  hrAdmin: 'hr_admin',
  superAdmin: 'super_admin',
};

export const ROLE_LABELS = {
  [ROLES.superAdmin]: 'Super Admin',
  [ROLES.hrAdmin]: 'HR Admin',
  [ROLES.outletManager]: 'Outlet Manager',
  [ROLES.employee]: 'Employee',
};

export const ASSIGNABLE_ROLES = [
  ROLES.employee,
  ROLES.outletManager,
  ROLES.hrAdmin,
  ROLES.superAdmin,
];

export const NOTICE_TARGET_ROLES = [
  ROLES.employee,
  ROLES.outletManager,
  ROLES.hrAdmin,
];
