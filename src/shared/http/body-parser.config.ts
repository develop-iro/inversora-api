type JsonBodyParserOptions = {
  limit: string;
};

type UrlEncodedBodyParserOptions = {
  extended: true;
  limit: string;
};

/**
 * Builds explicit body parser limits for API requests.
 */
export function buildBodyParserOptions(limit: string): {
  json: JsonBodyParserOptions;
  urlencoded: UrlEncodedBodyParserOptions;
} {
  return {
    json: { limit },
    urlencoded: { extended: true, limit },
  };
}
