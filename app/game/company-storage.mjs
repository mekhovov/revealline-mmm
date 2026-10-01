/** Browser storage can become unreadable independently of quota. A failed read
 * is not evidence that a record is absent: retain session-only play, report the
 * error, and refuse later writes that might overwrite unseen historical data. */
export function createCompanyStorage({
  getStorage = () => globalThis.localStorage,
  onError = () => {},
} = {}) {
  let readError = null;
  const report = (error) => {
    try {
      onError(error);
    } catch {
      /* A notice must not own persistence. */
    }
  };
  return Object.freeze({
    get readError() {
      return readError;
    },
    getItem(key) {
      try {
        return getStorage().getItem(key);
      } catch (error) {
        if (!readError) {
          readError = new Error(
            `Saved records could not be read. Progress is session-only; keep your original storage and export this tab before leaving. ${error.message}`,
          );
          report(readError);
        }
        return null;
      }
    },
    setItem(key, value) {
      if (readError) throw readError;
      try {
        getStorage().setItem(key, value);
      } catch (error) {
        report(error);
        throw error;
      }
    },
  });
}
