declare global {
  namespace NodeJS {
    interface ProcessEnv {
      KARON_TEST_ACCESS_ENABLED?: "true" | "false";
    }
  }
}

export {};
