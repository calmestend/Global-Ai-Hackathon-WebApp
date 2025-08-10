import React, { useState, useEffect, useRef, useCallback } from 'react';

type Props = {
	pushups_goal: number;
	time_per_pushup: number;
	onWorkoutComplete?: (result: { reps: number, timeElapsed: number, success: boolean, workoutSummary?: any }) => void;
};

export default function Pushups({ pushups_goal, time_per_pushup, onWorkoutComplete }: Props) {
	const [stage, setStage] = useState<'config' | 'countdown' | 'workout' | 'result'>('config');
	const [countdown, setCountdown] = useState(10);

	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const workoutManagerRef = useRef<any>(null);
	const workoutStartTimeRef = useRef<number>(0);
	const pushupTimesRef = useRef<number[]>([]);
	const lastPushupTimeRef = useRef<number>(0);
	const goalReachedRef = useRef<boolean>(false);

	const [reps, setReps] = useState(0);
	const [currentStage, setCurrentStage] = useState('Preparando...');
	const [timeElapsed, setTimeElapsed] = useState('00:00:00');
	const [progress, setProgress] = useState(0);

	class WorkoutManager {
		counter = 0;
		stage: string | null = null;
		startTime = Date.now();
		poseLandmarker: any = null;
		video: HTMLVideoElement | null = null;
		canvas: HTMLCanvasElement | null = null;
		ctx: CanvasRenderingContext2D | null = null;
		isRunning = false;

		calculateAngle(a: number[], b: number[], c: number[]) {
			const radians = Math.atan2(c[1] - b[1], c[0] - b[0]) -
				Math.atan2(a[1] - b[1], a[0] - b[0]);
			let angle = Math.abs(radians * 180.0 / Math.PI);
			if (angle > 180.0) angle = 360 - angle;
			return angle;
		}

		extractLandmarks(landmarks: any[], w: number, h: number) {
			if (!landmarks.length) return {};
			const lm = landmarks[0];
			return {
				shoulder: [lm[11].x * w, lm[11].y * h],
				elbow: [lm[13].x * w, lm[13].y * h],
				wrist: [lm[15].x * w, lm[15].y * h]
			};
		}

		calculateAndDisplayAngle(s: number[] | undefined, e: number[] | undefined, w: number[] | undefined) {
			if (!s || !e || !w) return { angle: 0, stage: this.stage, counter: this.counter };
			const angle = this.calculateAngle(s, e, w);
			if (angle > 160) this.stage = "UP";
			if (angle < 50 && this.stage === 'UP') {
				this.stage = "DOWN";
				this.counter++;

				// Registrar tiempo de cada push-up
				const currentTime = Date.now();
				if (lastPushupTimeRef.current > 0) {
					const timeBetweenPushups = (currentTime - lastPushupTimeRef.current) / 1000;
					pushupTimesRef.current.push(timeBetweenPushups);
				} else {
					// Primer push-up desde el inicio del workout
					const timeFromStart = (currentTime - workoutStartTimeRef.current) / 1000;
					pushupTimesRef.current.push(timeFromStart);
				}
				lastPushupTimeRef.current = currentTime;

				// Verificar si se alcanzó la meta
				if (this.counter >= pushups_goal && !goalReachedRef.current) {
					goalReachedRef.current = true;
					console.log(`🎯 Meta alcanzada! ${this.counter} push-ups completados`);
					setTimeout(() => {
						finishWorkout();
					}, 1000);
				}
			}
			return { angle, stage: this.stage, counter: this.counter };
		}

		updateUI(c: number, st: string | null, angle: number) {
			setReps(c);
			setCurrentStage(st || 'N/A');
			const progressValue = Math.max(0, Math.min(100, ((angle - 25) / (178 - 25)) * 100));
			setProgress(progressValue);
			const t = (Date.now() - this.startTime) / 1000;
			const hours = String(Math.floor(t / 3600)).padStart(2, '0');
			const minutes = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
			const seconds = String(Math.floor(t % 60)).padStart(2, '0');
			setTimeElapsed(`${hours}:${minutes}:${seconds}`);
		}

		drawPoseLandmarks(landmarks: any[], w: number, h: number) {
			if (!landmarks.length || !this.ctx) return;
			const lm = landmarks[0];
			const keyPoints = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

			keyPoints.forEach(i => {
				if (lm[i]) {
					const x = lm[i].x * w;
					const y = lm[i].y * h;
					this.ctx!.fillStyle = "#F57542";
					this.ctx!.beginPath();
					this.ctx!.arc(x, y, 5, 0, 2 * Math.PI);
					this.ctx!.fill();
					this.ctx!.strokeStyle = "white";
					this.ctx!.lineWidth = 2;
					this.ctx!.stroke();
				}
			});

			const connections = [[11, 13], [13, 15], [12, 14], [14, 16], [11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [27, 29], [27, 31], [24, 26], [26, 28], [28, 30], [28, 32]];
			this.ctx.lineWidth = 3;
			connections.forEach(([a, b]) => {
				if (lm[a] && lm[b]) {
					this.ctx!.beginPath();
					this.ctx!.moveTo(lm[a].x * w, lm[a].y * h);
					this.ctx!.lineTo(lm[b].x * w, lm[b].y * h);
					this.ctx!.strokeStyle = "#00FF00";
					this.ctx!.stroke();
				}
			});
		}

		async initializePose() {
			try {
				const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

				const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
				this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
					baseOptions: {
						modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
						delegate: "GPU"
					},
					runningMode: "VIDEO",
					numPoses: 1
				});
			} catch (error) {
				console.error('Error:', error);
				throw error;
			}
		}

		async initializeCamera() {
			try {
				this.video = videoRef.current;
				this.canvas = canvasRef.current;
				if (!this.video || !this.canvas) {
					throw new Error('Can not get the video');
				}

				this.ctx = this.canvas.getContext('2d');
				const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
				this.video.srcObject = stream;

				return new Promise<void>((resolve) => {
					if (this.video) {
						this.video.onloadedmetadata = () => {
							if (this.canvas && this.video) {
								this.canvas.width = this.video.videoWidth;
								this.canvas.height = this.video.videoHeight;
								resolve();
							}
						};
					}
				});
			} catch (error) {
				console.error(' Error:', error);
				throw error;
			}
		}

		async processVideo() {
			if (!this.poseLandmarker || !this.video || !this.canvas || !this.ctx || !this.isRunning) return;

			try {
				const results = this.poseLandmarker.detectForVideo(this.video, performance.now());
				this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

				if (results.landmarks && results.landmarks.length) {
					const { shoulder, elbow, wrist } = this.extractLandmarks(results.landmarks, this.canvas.width, this.canvas.height);
					const { angle, stage, counter } = this.calculateAndDisplayAngle(shoulder, elbow, wrist);
					this.updateUI(counter, stage, angle);
					this.drawPoseLandmarks(results.landmarks, this.canvas.width, this.canvas.height);
				} else {
					this.updateUI(this.counter, 'NO DETECT', 0);
				}
			} catch (error) {
				console.error('Error:', error);
			}

			// SIEMPRE continuar el bucle si isRunning es true
			if (this.isRunning) {
				requestAnimationFrame(() => this.processVideo());
			}
		}

		async start() {
			try {
				this.isRunning = true;
				await this.initializePose();
				await this.initializeCamera();
				this.processVideo();
			} catch (error) {
				console.error('Error:', error);
			}
		}

		stop() {
			this.isRunning = false;
		}
	}

	const finishWorkout = useCallback(() => {
		const workoutManager = workoutManagerRef.current;
		if (!workoutManager) return;

		// Detener el procesamiento de video
		workoutManager.stop();

		const totalTimeElapsed = (Date.now() - workoutStartTimeRef.current) / 1000;
		const completedReps = workoutManager.counter;
		const success = completedReps >= pushups_goal;

		// Calcular estadísticas
		const averageTimePerPushup = pushupTimesRef.current.length > 0
			? pushupTimesRef.current.reduce((a, b) => a + b, 0) / pushupTimesRef.current.length
			: 0;

		// Crear el resumen JSON y mostrarlo en consola
		const workoutSummary = {
			workout_summary: {
				goal: pushups_goal,
				completed: completedReps,
				success: success,
				completion_percentage: Math.round((completedReps / pushups_goal) * 100),
				total_time_seconds: Math.round(totalTimeElapsed * 100) / 100,
				average_time_per_pushup: Math.round(averageTimePerPushup * 100) / 100,
				individual_pushup_times: pushupTimesRef.current.map((time, index) => ({
					pushup: index + 1,
					time_seconds: Math.round(time * 100) / 100
				})),
				status: success ? "✅ OBJETIVO COMPLETADO" : "⚠️ OBJETIVO PARCIAL",
				performance: completedReps > pushups_goal ? "🎯 SUPERADO" :
					completedReps === pushups_goal ? "🎯 EXACTO" :
						completedReps >= pushups_goal * 0.8 ? "👍 BUENO" : "💪 CONTINÚA"
			}
		};

		console.log("🏃‍♂️ RESUMEN DE WORKOUT:");
		console.log(JSON.stringify(workoutSummary, null, 2));

		setStage('result');

		if (onWorkoutComplete) {
			onWorkoutComplete({
				reps: completedReps,
				timeElapsed: Math.round(totalTimeElapsed),
				success,
				workoutSummary
			});
		}
	}, [pushups_goal, onWorkoutComplete]);

	const handleIniciar = useCallback(() => {
		setStage('countdown');

		let count = 10;
		setCountdown(count);

		const interval = setInterval(() => {
			count--;
			setCountdown(count);

			if (count <= 0) {
				clearInterval(interval);
				setStage('workout');

				// Resetear referencias
				goalReachedRef.current = false;
				pushupTimesRef.current = [];
				lastPushupTimeRef.current = 0;
				workoutStartTimeRef.current = Date.now();

				const workoutManager = new WorkoutManager();
				workoutManagerRef.current = workoutManager;
				workoutManager.start();
			}
		}, 1000);
	}, []);

	// Botón manual para finalizar el workout
	const handleFinishWorkout = useCallback(() => {
		finishWorkout();
	}, [finishWorkout]);

	return (
		<div className="w-full max-w-4xl mx-auto">
			{stage === 'config' && (
				<div className="text-center py-8 bg-white rounded-lg shadow-lg">
					<div className="mb-4">
						<label className="block text-lg mb-2">Push-ups meta:</label>
						<span className="text-2xl font-bold text-blue-600">{pushups_goal}</span>
					</div>
					<div className="mb-6">
						<label className="block text-lg mb-2">Tiempo estimado por push-up:</label>
						<span className="text-2xl font-bold text-blue-600">{time_per_pushup}s</span>
					</div>
					<button
						onClick={handleIniciar}
						className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded text-lg"
					>
						Iniciar
					</button>
				</div>
			)}

			{/* Cuenta regresiva */}
			{stage === 'countdown' && (
				<div className="text-center py-8">
					<p className="text-xl mb-4">Starting workout</p>
					<div className="text-8xl font-bold text-red-500">{countdown}</div>
				</div>
			)}

			<div className="relative bg-black rounded-lg overflow-hidden">
				<video
					ref={videoRef}
					autoPlay
					muted
					playsInline
					className="w-full h-auto"
					style={{ display: stage === 'workout' ? 'block' : 'none' }}
				/>
				<canvas
					ref={canvasRef}
					className="absolute top-0 left-0 w-full h-full"
					style={{ display: stage === 'workout' ? 'block' : 'none' }}
				/>

				{stage === 'workout' && (
					<>
						<div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded">
							<div className="text-xs opacity-80">REPS</div>
							<div className="text-2xl font-bold">{reps}/{pushups_goal}</div>
						</div>

						<div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded">
							<div className="text-xs opacity-80">TIEMPO</div>
							<div className="text-lg">{timeElapsed}</div>
						</div>

						<div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded">
							<div className="text-xs opacity-80">STAGE</div>
							<div className="text-lg">{currentStage}</div>
						</div>

						<div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded">
							<div className="text-xs opacity-80">PROGRESO META</div>
							<div className="text-lg">{Math.floor((reps / pushups_goal) * 100)}%</div>
						</div>

						{/* Botón manual para terminar */}
						<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
							<button
								onClick={handleFinishWorkout}
								className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded opacity-20 hover:opacity-100 transition-opacity"
							>
								Terminar Workout
							</button>
						</div>

						<div className="absolute bottom-0 left-0 w-full h-2 bg-gray-800 bg-opacity-70">
							<div
								className="h-full bg-green-500 transition-all duration-200"
								style={{ width: `${Math.min(100, (reps / pushups_goal) * 100)}%` }}
							/>
						</div>
					</>
				)}
			</div>

			{stage === 'result' && (
				<div className="text-center py-8 bg-white rounded-lg shadow-lg">
					<h3 className="text-2xl font-bold mb-4">¡Workout Completado!</h3>
					<p className="text-lg mb-2">Completaste {reps} de {pushups_goal} push-ups</p>
					<p className="text-sm text-gray-600">Tiempo total: {timeElapsed}</p>
					<p className="text-sm text-gray-500 mt-2">
						Revisa la consola para ver el resumen detallado 📊
					</p>
				</div>
			)}
		</div>
	);
}
