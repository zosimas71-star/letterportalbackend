/** The ONLY projection used to return a user - password_hash can never leak by accident. */
export const userPublicSelect = {
  user_id: true,
  employee_number: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  account_status: true,
  created_at: true,
};
export const assignmentSelect = {
  assignment_id: true,
  user_id: true,
  role_id: true,
  directory_id: true,
  assigned_by: true,
  assigned_at: true,
  is_active: true,
};
