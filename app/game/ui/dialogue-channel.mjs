/** One spoken line per page, including radio and Studio auditions. */
let active = null;
export const dialogueChannel = Object.freeze({
  get active() {
    return active;
  },
  claim(voice) {
    if (active !== voice) active?.stop();
    active = voice;
  },
  release(voice) {
    if (active === voice) active = null;
  },
  interrupt() {
    active?.stop();
  },
  snapshot() {
    return Object.freeze({
      voices: active ? 1 : 0,
      kind: active?.radio ? 'radio' : active ? 'dialogue' : null,
    });
  },
});
