import { drawActorRecipe } from '../ui/actor-recipes.mjs';
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h)};
function drawPaperActor(c, f, colors) {
  const compact = f.style === 'microtile',
    step = f.reduced ? 0 : Math.floor(f.travelPhase * 6) % 2;
  if (f.role === 'boss' || f.role === 'eroder') {
    for (let i = 0; i < 4; i++) {
      c.save();
      c.rotate((i * Math.PI) / 2);
      rect(c, colors.dark, -4, -13, 8, 8);
      rect(c, colors.trim, -3, -12, 6, 6);
      if (!compact) rect(c, colors.light, -2, -11, 2, 2);
      c.restore();
    }
    rect(c, colors.dark, -7, -7, 14, 14);
    rect(c, colors.body, -5, -5, 10, 10);
  } else if (f.role === 'patrol' || f.role === 'contour') {
    rect(c, colors.dark, -13, -13, 26, 26);
    rect(c, colors.body, -12, -12, 24, 24);
    rect(c, colors.light, -12, -12, 24, 2);
    rect(c, colors.trim, -2, -12, 4, 24);
    rect(c, colors.dark, -4, -2, 8, 4);
    rect(c, colors.light, -2, -2, 4, 2);
    rect(c, colors.trim, -5, 10 + step, 3, 2);
    rect(c, colors.trim, 2, 11 - step, 3, 2);
  } else {
    rect(c, colors.dark, -9, -12, 18, 24);
    rect(c, colors.light, -7, -12, 14, 24);
    rect(c, colors.body, -7, -10, 14, 4);
    rect(c, colors.trim, 3, -10, 4, 4);
    for (let y = -2; y < 7; y += 4) rect(c, colors.dark, -4, y, compact ? 6 : 8, 1);
    rect(c, colors.body, -11, 4 + step, 3, 6);
    rect(c, colors.body, 8, 5 - step, 3, 6);
    if (f.role === 'rover') {
      rect(c, colors.dark, -10, 11, 7, 3);
      rect(c, colors.dark, 3, 11, 7, 3);
    }
  }
}

export function drawBrandActor(context,frame,colors){if(!drawActorRecipe(context,frame,colors))drawPaperActor(context,frame,colors);return true;}
