class RequestBodyTooLargeError extends Error {}

class InvalidRequestBodyError extends Error {}

const readLimitedText = async (request: Request, maxBytes: number) => {
  const declaredLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyTooLargeError("Request body is too large");
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let result = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        return result + decoder.decode();
      }

      total += value.byteLength;

      if (total > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError("Request body is too large");
      }

      result += decoder.decode(value, { stream: true });
    }
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      throw error;
    }

    throw new InvalidRequestBodyError("Request body is invalid");
  } finally {
    reader.releaseLock();
  }
};

export {
  InvalidRequestBodyError,
  RequestBodyTooLargeError,
  readLimitedText
};
