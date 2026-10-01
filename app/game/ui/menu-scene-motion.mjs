const MAX_REGIONS = 4;
const FRAME_MS = 1000 / 30;
const MAX_AREA = 1600 * 900;
const TAU = Math.PI * 2;
const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
}`;
const fragmentSource = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_picture;
uniform vec3 u_camera;
uniform int u_count;
uniform vec4 u_rects[${MAX_REGIONS}];
uniform vec4 u_motion[${MAX_REGIONS}];
void main() {
  vec2 uv = (v_uv - 0.5) / u_camera.x + 0.5 + u_camera.yz;
  vec2 displacement = vec2(0.0);
  float light = 0.0;
  for (int i = 0; i < ${MAX_REGIONS}; i++) {
    if (i < u_count) {
      vec4 rect = u_rects[i];
      vec4 motion = u_motion[i];
      vec2 local = (uv - rect.xy) / rect.zw;
      vec2 feather = smoothstep(vec2(0.0), vec2(0.2), local)
        * (1.0 - smoothstep(vec2(0.8), vec2(1.0), local));
      float mask = feather.x * feather.y;
      float phase = motion.w;
      if (motion.x > 1.5 && motion.x < 2.5) {
        displacement += mask * vec2(0.0012 * sin(uv.y * 360.0 + phase),
          0.00035 * sin(uv.x * 200.0 + phase * 2.0));
        light += mask * 0.014 * sin(uv.y * 480.0 + phase);
      } else if (motion.x > 2.5 && motion.x < 3.5) {
        light += mask * 0.045 * sin(phase);
      } else if (motion.x > 4.5) {
        float rooted = mask * (1.0 - smoothstep(0.55, 1.0, local.y));
        displacement += rooted * vec2(0.0016 * sin(phase + local.y * 2.2),
          0.00045 * sin(phase + local.x * 3.0));
      }
    }
  }
  // Periodic local warp is at most .003 UV. Sky drift adds at most .008, so
  // the complete .011 bound remains inside the fixed 1.025 overscan.
  vec2 sampled = clamp(uv + clamp(displacement, vec2(-0.003), vec2(0.003)),
    vec2(0.0005), vec2(0.9995));
  vec3 color = texture2D(u_picture, sampled).rgb;
  for (int i = 0; i < ${MAX_REGIONS}; i++) {
    if (i < u_count) {
      vec4 motion = u_motion[i];
      if (motion.x < 1.5 || (motion.x > 3.5 && motion.x < 4.5)) {
        vec4 rect = u_rects[i];
        vec2 local = (uv - rect.xy) / rect.zw;
        vec2 feather = smoothstep(vec2(0.0), vec2(0.2), local)
          * (1.0 - smoothstep(vec2(0.8), vec2(1.0), local));
        float mask = feather.x * feather.y;
        if (mask > 0.0) {
          if (motion.x < 1.5) {
            // One source sample makes painted clouds visibly drift. Symmetric
            // crossfades cancel translation on smooth sky gradients.
            vec2 shifted = clamp(sampled - motion.yz, rect.xy, rect.xy + rect.zw);
            color = mix(color, texture2D(u_picture, shifted).rgb, mask);
          } else {
            // Steam keeps rising texture flow with a small moving column.
            vec2 sway = vec2(0.0012 * sin(motion.y * 6.28318530718), 0.0);
            vec2 flow = vec2(0.0, -0.004);
            vec2 a = clamp(sampled + sway - flow * (motion.y - 0.5), rect.xy, rect.xy + rect.zw);
            vec2 b = clamp(sampled + sway - flow * (motion.z - 0.5), rect.xy, rect.xy + rect.zw);
            vec3 flowing = mix(texture2D(u_picture, b).rgb,
              texture2D(u_picture, a).rgb, motion.w);
            color = mix(color, flowing, mask);
          }
        }
      }
    }
  }
  gl_FragColor = vec4(clamp(color * (1.0 + clamp(light, -0.055, 0.055)), 0.0, 1.0), 1.0);
}`;

function regions(profile, vertical) {
  const kinds = { cloud: 1, water: 2, lamp: 3, beam: 3, steam: 4, foliage: 5 };
  const rows = (vertical ? profile?.portraitEnvironment : profile?.environment) ?? [];
  const rects = new Float32Array(MAX_REGIONS * 4),
    motion = new Float32Array(MAX_REGIONS * 4),
    timing = new Float64Array(MAX_REGIONS * 2);
  let count = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (
      count === MAX_REGIONS ||
      !Object.hasOwn(kinds, row?.kind) ||
      ![row.x, row.y, row.width, row.height].every(Number.isFinite) ||
      row.x < 0 ||
      row.y < 0 ||
      row.width <= 0 ||
      row.height <= 0 ||
      row.x + row.width > 100 ||
      row.y + row.height > 100
    )
      continue;
    rects.set([row.x / 100, row.y / 100, row.width / 100, row.height / 100], count * 4);
    motion[count * 4] = kinds[row.kind];
    timing.set(
      [
        Number.isFinite(row.duration) ? Math.max(4, Math.min(24, row.duration)) : 16,
        Number.isFinite(row.delay) ? Math.max(-24, Math.min(24, row.delay)) : -count * 2,
      ],
      count * 2,
    );
    count++;
  }
  return { count, rects, motion, timing };
}

/** The same qualification drives host fallback copy and actual GPU motion. */
export function artworkMotionMode(profile, vertical = false) {
  return regions(profile, vertical).count > 0 ? 'regions' : 'static';
}

/** One complete image texture. The host owns positioning, visibility/reduced
 * motion policy and the shared CSS arrival; onReady reveals the prepared canvas
 * without changing that parent transform. No new image request, gameplay clock or input is created. */
export function attachArtworkMotion({
  canvas,
  image,
  profile,
  vertical = false,
  onReady = () => {},
}) {
  const doc = canvas?.ownerDocument,
    win = doc?.defaultView;
  if (!canvas || !image) throw new TypeError('Artwork motion needs a canvas and its source image.');
  let currentProfile = profile,
    currentVertical = Boolean(vertical),
    disposed = false,
    wanted = false,
    lost = false,
    ready = null,
    gl = null,
    gpu = null,
    frame = null,
    lastStamp = null,
    lastDraw = null,
    seconds = 0,
    uploaded = '',
    failed = '',
    current = '',
    regionData = regions(profile, vertical);
  const source = () => String(image.src || image.currentSrc || '');
  function publish(value) {
    canvas.hidden = !value;
    if (ready === value) return;
    ready = value;
    onReady(value);
  }
  function stop() {
    if (frame !== null) win?.cancelAnimationFrame?.(frame);
    frame = lastStamp = lastDraw = null;
  }
  function release() {
    if (gl && gpu) {
      if (gpu.texture) gl.deleteTexture(gpu.texture);
      if (gpu.buffer) gl.deleteBuffer(gpu.buffer);
      if (gpu.program) gl.deleteProgram(gpu.program);
      for (const shader of gpu.shaders) gl.deleteShader(shader);
    }
    gpu = null;
    uploaded = '';
  }
  function unavailable(key) {
    stop();
    release();
    failed = key;
    canvas.width = canvas.height = 0;
    publish(false);
  }
  function initialize() {
    if (gpu) return;
    gl ??= canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    });
    if (!gl) throw new Error('WebGL artwork is unavailable.');
    gpu = { shaders: [], program: null, buffer: null, texture: null };
    for (const [kind, code] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ]) {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error('Artwork shader allocation failed.');
      gpu.shaders.push(shader);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error('Artwork shader failed.');
    }
    gpu.program = gl.createProgram();
    if (!gpu.program) throw new Error('Artwork program allocation failed.');
    for (const shader of gpu.shaders) gl.attachShader(gpu.program, shader);
    gl.linkProgram(gpu.program);
    if (!gl.getProgramParameter(gpu.program, gl.LINK_STATUS))
      throw new Error('Artwork program failed.');
    gl.useProgram(gpu.program);
    gpu.buffer = gl.createBuffer();
    gpu.texture = gl.createTexture();
    if (!gpu.buffer || !gpu.texture) throw new Error('Artwork surface allocation failed.');
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(gpu.program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gpu.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gpu.uniforms = Object.fromEntries(
      ['picture', 'camera', 'count', 'rects[0]', 'motion[0]'].map((name) => [
        name,
        gl.getUniformLocation(gpu.program, `u_${name}`),
      ]),
    );
    gl.uniform1i(gpu.uniforms.picture, 0);
  }
  function draw() {
    // The shared host owns the single CSS entrance for both image and canvas.
    // This camera never moves; only qualified source-image features animate.
    gl.uniform3f(gpu.uniforms.camera, regionData.count > 0 ? 1.025 : 1, 0, 0);
    // Bounded phases avoid mediump shader precision decay in long menu sessions.
    for (let i = 0; i < regionData.count; i++) {
      const at = i * 4,
        period = regionData.timing[i * 2],
        delay = regionData.timing[i * 2 + 1],
        progress = ((((seconds + delay) % period) + period) % period) / period;
      if (regionData.motion[at] === 1) {
        const secondaryPeriod = period * 1.73,
          secondary =
            (((((seconds + delay) % secondaryPeriod) + secondaryPeriod) % secondaryPeriod) /
              secondaryPeriod) *
            TAU,
          horizontal = Math.min(0.008, regionData.rects[at + 2] * 0.08),
          vertical = Math.min(0.00065, regionData.rects[at + 3] * 0.05);
        regionData.motion[at + 1] =
          horizontal * (0.75 * Math.sin(progress * TAU + 0.55) + 0.25 * Math.sin(secondary + 1.13));
        regionData.motion[at + 2] = vertical * Math.sin(secondary - 0.4);
        regionData.motion[at + 3] = progress * TAU;
      } else if (regionData.motion[at] === 4) {
        regionData.motion[at + 1] = progress;
        regionData.motion[at + 2] = (progress + 0.5) % 1;
        regionData.motion[at + 3] = 1 - Math.abs(progress * 2 - 1);
      } else regionData.motion[at + 3] = progress * TAU;
    }
    gl.uniform1i(gpu.uniforms.count, regionData.count);
    gl.uniform4fv(gpu.uniforms['rects[0]'], regionData.rects);
    gl.uniform4fv(gpu.uniforms['motion[0]'], regionData.motion);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function queue() {
    if (!regionData.count) {
      stop();
      return;
    }
    if (!disposed && wanted && ready && !lost && frame === null && win?.requestAnimationFrame)
      frame = win.requestAnimationFrame(tick);
  }
  function tick(stamp) {
    frame = null;
    if (disposed || !wanted || !ready || lost) return;
    if (source() !== current || image.complete === false) {
      prepare();
      return;
    }
    if (lastStamp === null) lastDraw = stamp;
    else {
      const delta = stamp - lastStamp;
      // Suspended browsers never fast-forward the picture when callbacks return.
      if (delta >= 0 && delta <= 250) {
        seconds += delta / 1000;
      }
    }
    lastStamp = stamp;
    if (stamp - lastDraw >= FRAME_MS - 0.01) {
      try {
        draw();
      } catch {
        unavailable(current);
        return;
      }
      lastDraw = stamp;
    }
    queue();
  }
  function prepare(force = false) {
    if (disposed || lost) return;
    const key = source();
    if (current !== key) {
      stop();
      current = key;
      seconds = 0;
      failed = '';
      publish(false);
    }
    const width = image.naturalWidth || image.width,
      height = image.naturalHeight || image.height;
    if (image.complete === false || !(width > 0 && height > 0)) {
      stop();
      publish(false);
      return;
    }
    const signature = `${key}:${width}:${height}`;
    if (failed === key) return;
    if (uploaded === signature && !force) {
      queue();
      return;
    }
    try {
      initialize();
      const scale = Math.min(
        1,
        1600 / width,
        1600 / height,
        Math.sqrt(MAX_AREA / (width * height)),
      );
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      // Bound GPU texture allocation as well as draw resolution. This temporary
      // whole-picture reduction creates no independently moving overlay image.
      let upload = image,
        scratch = null;
      try {
        if (canvas.width !== width || canvas.height !== height) {
          scratch = doc.createElement('canvas');
          scratch.width = canvas.width;
          scratch.height = canvas.height;
          const context = scratch.getContext('2d');
          if (!context) throw new Error('Artwork reduction is unavailable.');
          context.drawImage(image, 0, 0, scratch.width, scratch.height);
          upload = scratch;
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, upload);
      } finally {
        if (scratch) scratch.width = scratch.height = 0;
      }
      draw();
      if (gl.getError() !== gl.NO_ERROR || gl.isContextLost())
        throw new Error('Artwork upload failed.');
      uploaded = signature;
      publish(true);
      queue();
    } catch {
      unavailable(key);
    }
  }
  const loaded = () => {
    failed = '';
    prepare(true);
  };
  const imageFailed = () => unavailable(source());
  const contextLost = (event) => {
    event.preventDefault();
    lost = true;
    stop();
    // Context-owned handles are invalid after loss; restoration allocates anew.
    gpu = gl = null;
    uploaded = '';
    publish(false);
  };
  const contextRestored = () => {
    lost = false;
    failed = '';
    prepare(true);
  };
  image.addEventListener?.('load', loaded);
  image.addEventListener?.('error', imageFailed);
  canvas.addEventListener?.('webglcontextlost', contextLost);
  canvas.addEventListener?.('webglcontextrestored', contextRestored);
  publish(false);
  prepare();
  return Object.freeze({
    update({
      profile: nextProfile = currentProfile,
      vertical: nextVertical = currentVertical,
    } = {}) {
      if (disposed) return;
      const changed = nextProfile !== currentProfile || Boolean(nextVertical) !== currentVertical;
      currentProfile = nextProfile;
      currentVertical = Boolean(nextVertical);
      if (changed) regionData = regions(currentProfile, currentVertical);
      prepare();
      if (changed && ready) {
        try {
          draw();
        } catch {
          unavailable(current);
        }
      }
    },
    setRunning(value) {
      if (disposed || wanted === Boolean(value)) return;
      wanted = Boolean(value);
      if (!wanted) stop();
      else {
        prepare();
        queue();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      image.removeEventListener?.('load', loaded);
      image.removeEventListener?.('error', imageFailed);
      canvas.removeEventListener?.('webglcontextlost', contextLost);
      canvas.removeEventListener?.('webglcontextrestored', contextRestored);
      release();
      gl = null;
      canvas.width = canvas.height = 0;
      publish(false);
    },
  });
}
