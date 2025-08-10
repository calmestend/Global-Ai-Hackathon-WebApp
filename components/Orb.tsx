import { useEffect } from "react";


export function Orb() {
    useEffect(() => {
        // Adapted from
        // https://codepen.io/pekopekopeko/pen/PbYRWps

        const el = document.getElementById("canvas") as HTMLCanvasElement | null;
        if (!el) return;
        const ctx = el.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const pi = Math.PI;
        const points = 8;
        const radius =30 * 5;
        const h = 250 * dpr;
        const w = 250 * dpr;
        const center = {
            x: w / 2,
            y: h / 2
        };
        const circles: any[] = [];
        const rangeMin = 1;
        const rangeMax = 30;
        const showPoints = true;

        let mouseY = 0;
        let tick = 0;

        const gradient1 = ctx.createLinearGradient(0, 0, w, 0);
        gradient1.addColorStop(0, "#96fbc4");
        gradient1.addColorStop(1, "#f9f586");

        const gradient2 = ctx.createLinearGradient(0, 0, w, 0);
        gradient2.addColorStop(0, "#48c6ef");
        gradient2.addColorStop(1, "#6f86d6");

        const gradient3 = ctx.createLinearGradient(0, 0, w, 0);
        gradient3.addColorStop(0, "#9795f0");
        gradient3.addColorStop(1, "#9be15d");

        const gradient4 = ctx.createLinearGradient(0, 0, w, 0);
        gradient4.addColorStop(0, "#f6d365");
        gradient4.addColorStop(1, "#fda085");

        const gradients = [gradient1, gradient2, gradient3, gradient4];

        function handleMove(event: MouseEvent) {
            mouseY = event.clientY;
        }
        window.addEventListener("mousemove", handleMove, true);

        // Set canvas size and scale for HiDPI screens
        el.width = w * dpr;
        el.height = h * dpr;
        el.style.width = w + "px";
        el.style.height = h + "px";
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
        ctx.scale(dpr, dpr);

        // Setup swing circle points
        for (let idx = 0; idx < gradients.length; idx++) {
            let swingpoints = [];
            let radian = 0;
            for (let i = 0; i < points; i++) {
                radian = ((pi * 2) / points) * i;
                let ptX = center.x + radius * Math.cos(radian);
                let ptY = center.y + radius * Math.sin(radian);
                swingpoints.push({
                    x: ptX,
                    y: ptY,
                    radian: radian,
                    range: random(rangeMin, rangeMax),
                    phase: 0
                });
            }
            circles.push(swingpoints);
        }

        function swingCircle() {
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "screen";
            for (let k = 0; k < circles.length; k++) {
                let swingpoints = circles[k];
                for (let i = 0; i < swingpoints.length; i++) {
                    swingpoints[i].phase += random(1, 10) * -0.01;
                    let phase = 4 * Math.sin(tick / 65);
                    if (mouseY !== 0) {
                        phase = mouseY / 200 + 1;
                    }
                    let r =
                        radius +
                        swingpoints[i].range * phase * Math.sin(swingpoints[i].phase) -
                        rangeMax;
                    swingpoints[i].radian += pi / 360;
                    let ptX = center.x + r * Math.cos(swingpoints[i].radian);
                    let ptY = center.y + r * Math.sin(swingpoints[i].radian);
                    if (showPoints === true) {
                        ctx.strokeStyle = "#96fbc4";
                        ctx.beginPath();
                        ctx.arc(ptX, ptY, 2, 0, pi * 2, true);
                        ctx.closePath();
                        ctx.stroke();
                    }
                    swingpoints[i] = {
                        x: ptX,
                        y: ptY,
                        radian: swingpoints[i].radian,
                        range: swingpoints[i].range,
                        phase: swingpoints[i].phase
                    };
                }
                const fill = gradients[k];
                drawCurve(swingpoints, fill);
            }
            tick++;
            requestAnimationFrame(swingCircle);
        }

        function drawCurve(pts: any[], fillStyle: CanvasGradient) {
            if (!ctx) return;
            ctx.fillStyle = fillStyle;
            ctx.beginPath();
            ctx.moveTo(
                (pts[cycle(-1, points)].x + pts[0].x) / 2,
                (pts[cycle(-1, points)].y + pts[0].y) / 2
            );
            for (let i = 0; i < pts.length; i++) {
                ctx.quadraticCurveTo(
                    pts[i].x,
                    pts[i].y,
                    (pts[i].x + pts[cycle(i + 1, points)].x) / 2,
                    (pts[i].y + pts[cycle(i + 1, points)].y) / 2
                );
            }
            ctx.closePath();
            ctx.fill();
        }

        function cycle(num1: number, num2: number) {
            return ((num1 % num2) + num2) % num2;
        }

        function random(num1: number, num2: number) {
            let max = Math.max(num1, num2);
            let min = Math.min(num1, num2);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        requestAnimationFrame(swingCircle);

        // Limpieza del eventListener al desmontar
        return () => {
            window.removeEventListener("mousemove", handleMove, true);
        };
    }, []);

    return (
        <div className="flex flex-col items-center ">
            <canvas id="canvas" className="canvas " width={70} height={70}></canvas>
            <div className="copy">
                <h1></h1>
            </div>
        </div>
    );
}

//   return (
//     <div className="flex flex-col items-center">
//       <canvas id="canvas" className="canvas my-16 mx-12"></canvas>
//       <div className="copy">
//         <h1></h1>
//       </div>
//     </div>
//   );


