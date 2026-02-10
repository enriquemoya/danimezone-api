export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const ApiErrors = {
  unauthorized: new ApiError(401, "UNAUTHORIZED", "unauthorized"),
  serverError: new ApiError(500, "SERVER_ERROR", "server error"),
  invalidRequest: new ApiError(400, "INVALID_REQUEST", "invalid request"),
  catalogFiltersInvalid: new ApiError(400, "CATALOG_FILTERS_INVALID", "catalog filters invalid"),
  eventsRequired: new ApiError(400, "EVENTS_REQUIRED", "events required"),
  posIdRequired: new ApiError(400, "POS_ID_REQUIRED", "posId required"),
  posAckRequired: new ApiError(400, "POS_ACK_REQUIRED", "posId and eventIds required"),
  orderRequired: new ApiError(400, "ORDER_REQUIRED", "orderId and items required"),
  invalidPagination: new ApiError(400, "INVALID_PAGINATION", "invalid pagination"),
  adminPaginationInvalid: new ApiError(400, "ADMIN_PAGINATION_INVALID", "pagination invalid"),
  emailRequired: new ApiError(400, "EMAIL_REQUIRED", "email required"),
  phoneRequired: new ApiError(400, "PHONE_REQUIRED", "phone required"),
  emailOrPhoneRequired: new ApiError(400, "EMAIL_OR_PHONE_REQUIRED", "email or phone required"),
  emailInvalid: new ApiError(400, "EMAIL_INVALID", "email invalid"),
  phoneInvalid: new ApiError(400, "PHONE_INVALID", "phone invalid"),
  roleInvalid: new ApiError(400, "ROLE_INVALID", "role invalid"),
  statusInvalid: new ApiError(400, "STATUS_INVALID", "status invalid"),
  emailExists: new ApiError(400, "EMAIL_EXISTS", "email already exists"),
  phoneExists: new ApiError(400, "PHONE_EXISTS", "phone already exists"),
  userNotFound: new ApiError(404, "USER_NOT_FOUND", "user not found"),
  addressNotFound: new ApiError(404, "ADDRESS_NOT_FOUND", "address not found"),
  addressInvalid: new ApiError(400, "ADDRESS_INVALID", "address invalid"),
  inventoryNotFound: new ApiError(404, "INVENTORY_NOT_FOUND", "inventory item not found"),
  inventoryInvalid: new ApiError(400, "INVENTORY_INVALID", "inventory adjustment invalid"),
  taxonomyNotFound: new ApiError(404, "TAXONOMY_NOT_FOUND", "taxonomy not found"),
  taxonomyInvalid: new ApiError(400, "TAXONOMY_INVALID", "taxonomy invalid"),
  productNotFound: new ApiError(404, "PRODUCT_NOT_FOUND", "product not found"),
  productInvalid: new ApiError(400, "PRODUCT_INVALID", "product invalid"),
  productSlugExists: new ApiError(400, "PRODUCT_SLUG_EXISTS", "product slug exists"),
  checkoutInvalid: new ApiError(400, "CHECKOUT_INVALID", "checkout invalid"),
  checkoutDraftEmpty: new ApiError(400, "CHECKOUT_DRAFT_EMPTY", "checkout draft empty"),
  checkoutDraftInactive: new ApiError(400, "CHECKOUT_DRAFT_INACTIVE", "checkout draft inactive"),
  checkoutInventoryInsufficient: new ApiError(400, "CHECKOUT_INVENTORY_INSUFFICIENT", "checkout inventory insufficient"),
  checkoutDraftNotFound: new ApiError(404, "CHECKOUT_DRAFT_NOT_FOUND", "checkout draft not found"),
  checkoutOrderNotFound: new ApiError(404, "CHECKOUT_ORDER_NOT_FOUND", "checkout order not found"),
  orderStatusInvalid: new ApiError(400, "ORDER_STATUS_INVALID", "order status invalid"),
  orderTransitionInvalid: new ApiError(400, "ORDER_TRANSITION_INVALID", "order transition invalid"),
  orderTransitionReasonRequired: new ApiError(400, "ORDER_TRANSITION_REASON_REQUIRED", "order transition reason required"),
  orderForbidden: new ApiError(403, "ORDER_FORBIDDEN", "order forbidden"),
  branchNotFound: new ApiError(404, "BRANCH_NOT_FOUND", "branch not found")
};

export function asApiError(error: unknown, fallback: ApiError): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  return fallback;
}
