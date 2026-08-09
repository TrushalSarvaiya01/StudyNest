// Shared helpers for parsing pagination, sorting, and filter query params
// across the public and admin document-listing routes.

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

function parsePagination(req, defaultLimit = DEFAULT_LIMIT) {
  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = defaultLimit;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return { page, limit, skip: (page - 1) * limit };
}

// allowedFields: { queryValue: mongoSortObject }
function parseSort(req, allowedFields, defaultKey) {
  const key = allowedFields[req.query.sort] ? req.query.sort : defaultKey;
  return { sortKey: key, sort: allowedFields[key] };
}

function buildMeta({ total, page, limit }) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { parsePagination, parseSort, buildMeta, DEFAULT_LIMIT, MAX_LIMIT };
