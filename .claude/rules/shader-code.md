# Shader Code Standards

- Naming: `[type]_[category]_[name].gdshader` (spatial_env_water.gdshader, canvas_fx_blur.gdshader)
- All uniforms must have descriptive names + hints: `uniform float wave_speed : hint_range(0.1, 5.0) = 1.0;`
- Group uniforms with group_uniforms for inspector organization.
- Use source_color hint for color uniforms: `uniform vec4 tint_color : source_color = vec4(1.0);`
- Minimize texture samples in fragment shader. Pre-compute in vertex when possible.
- Avoid dynamic branching — use step(), mix(), smoothstep() instead of if/else.
- NO texture reads inside loops.
- Two-pass approach for blur effects (horizontal + vertical).
- Mobile optimization: use mediump/lowp precision where quality allows.
- Document performance cost: "~X instructions fragment, Y texture samples."
