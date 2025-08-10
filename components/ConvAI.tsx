"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import { useCallback, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConversation } from "@11labs/react";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import Pushups from "./pushups";

async function requestMicrophonePermission() {
	try {
		await navigator.mediaDevices.getUserMedia({ audio: true });
		return true;
	} catch {
		console.error("Microphone permission denied");
		return false;
	}
}

async function getSignedUrl(): Promise<string> {
	const response = await fetch("/api/signed-url");
	if (!response.ok) {
		throw Error("Failed to get signed url");
	}
	const data = await response.json();
	return data.signedUrl;
}

export function ConvAI() {
	const [route, setRoute] = useState<"home" | "workout" | "workout_pushups" | "result">("home");
	const [workoutResult, setWorkoutResult] = useState<string>("");
	const [workoutActive, setWorkoutActive] = useState(false); // Nuevo estado para controlar si el workout está activo

	// User data
	const [userAge, setUserAge] = useState<number | null>(null);
	const [userWeight, setUserWeight] = useState<string | null>(null);
	const [userHeight, setUserHeight] = useState<string | null>(null);
	const [userSex, setUserSex] = useState<string | null>(null);
	const [pushupGoal, setPushupGoal] = useState<number | null>(null);
	const [timePerPushup, setTimePerPushup] = useState<number | null>(null);

	// Modals
	const [showWorkoutModal, setShowWorkoutModal] = useState(false);
	const [showResultModal, setShowResultModal] = useState(false);
	const [showPushupsModal, setShowPushupsModal] = useState(false);

	// Control de modales según la ruta
	useEffect(() => {
		if (route === "workout") {
			setShowWorkoutModal(true);
			setShowResultModal(false);
			setShowPushupsModal(true);
			setWorkoutActive(true); // Activar workout
		} else if (route === "workout_pushups") {
			setShowWorkoutModal(false);
			setShowResultModal(false);
			setShowPushupsModal(true);
			setWorkoutActive(true); // Mantener workout activo
		} else if (route === "result") {
			setShowWorkoutModal(false);
			setShowResultModal(true);
			setShowPushupsModal(false);
			setWorkoutActive(false); // Desactivar workout
		} else if (route === "home") {
			setShowWorkoutModal(false);
			setShowResultModal(false);
			setShowPushupsModal(false);
			setWorkoutActive(false); // Desactivar workout
		}
	}, [route]);

	const conversation = useConversation({
		onConnect: () => console.log("connected"),
		onDisconnect: () => console.log("disconnected"),
		onError: (error) => {
			console.error(error);
			alert("An error occurred during the conversation");
		},
		onMessage: (result) => {
			console.log(result);

			if (result?.source === "ai" && typeof result.message === "string") {
				// Detección MUY ESTRICTA - solo frases exactas al final de mensaje
				// "starting workout" debe estar al final del mensaje, no como referencia
				if (/\bstarting workout\s*$/.test(result.message.trim())) {
					console.log("DETECTED: starting workout");
					setRoute("workout");
					(conversation as any).sendContextualUpdate?.(`route: workout`);
				}

				// "beginning pushups exercise" debe estar al final del mensaje
				if (/\bbeginning pushups exercise\s*$/.test(result.message.trim())) {
					console.log("DETECTED: beginning pushups exercise");
					setRoute("workout_pushups");
					(conversation as any).sendContextualUpdate?.(`route: workout_pushups`);
				}

				// "ending workout" debe estar al final del mensaje
				if (/\bending workout\s*$/.test(result.message.trim())) {
					console.log("DETECTED: ending workout");
					setRoute("result");
					(conversation as any).sendContextualUpdate?.(`route: result`);
				}

				// "ending session" debe estar al final del mensaje
				if (/\bending session\s*$/.test(result.message.trim())) {
					console.log("DETECTED: ending session");
					setRoute("home");
					setTimeout(() => {
						conversation.endSession();
					}, 500);
				}

				// Detección estricta de push-up goals - solo números
				const pushupGoalsMatch = result.message.match(/setting pushup goals:\s*(\d{1,3})\s*push-ups at\s*(\d{1,3})\s*seconds each/i);
				if (pushupGoalsMatch) {
					console.log("DETECTED: pushup goals", pushupGoalsMatch[1], pushupGoalsMatch[2]);
					setPushupGoal(Number(pushupGoalsMatch[1]));
					setTimePerPushup(Number(pushupGoalsMatch[2]));
					(conversation as any).sendContextualUpdate?.(
						`route: ${route}\n` +
						(userAge ? `user_age: ${userAge}\n` : "") +
						(userWeight ? `user_weight: ${userWeight}\n` : "") +
						(userHeight ? `user_height: ${userHeight}\n` : "") +
						(userSex ? `user_sex: ${userSex}\n` : "") +
						`pushup_goal: ${pushupGoalsMatch[1]}\n` +
						`time_per_pushup: ${pushupGoalsMatch[2]}\n` +
						(workoutResult ? `workout_result: ${workoutResult}` : "")
					);
				}
			}

			// Detectar respuestas de ejercicios completados y datos del usuario SOLO de mensajes del USUARIO
			if (result?.source === "user" && typeof result.message === "string") {
				// Detectar cuando el usuario quiere empezar push-ups - mejorado regex
				if (/(want to start|ready for|begin|start).*(push[- ]?ups)|(push[- ]?ups).*(start|begin)/i.test(result.message)) {
					console.log("USER WANTS TO START PUSHUPS:", result.message);
					// No cambiar ruta aquí, dejar que el AI responda primero
				}

				// MODIFICADO: Solo detectar ejercicios completados si NO hay un workout activo
				// Y solo con frases MUY específicas de finalización
				if (!workoutActive) {
					// Patrones MUY específicos que indican finalización completa del workout
					const completionPatterns = [
						/^(I\s+)?(just\s+)?(completed|finished|done with)\s+(the\s+)?(entire\s+)?(workout|exercise\s+session|training)/i,
						/^(I\s+)?(have\s+)?(completed|finished)\s+(all\s+)?\d+\s+push[- ]?ups\s+(successfully|completely)$/i,
						/^(workout|exercise|training)\s+(is\s+)?(completed|finished|done)$/i,
						/^(I\s+)?(successfully\s+)?(completed|finished)\s+(my\s+)?(full\s+)?(workout|exercise\s+routine)$/i
					];

					const isWorkoutComplete = completionPatterns.some(pattern =>
						pattern.test(result.message.trim())
					);

					if (isWorkoutComplete) {
						console.log("USER COMPLETED FULL WORKOUT:", result.message);
						setRoute("result");
						setWorkoutResult(result.message);
						(conversation as any).sendContextualUpdate?.(
							`route: result\nworkout_result: ${result.message}`
						);
					}
				} else {
					console.log("WORKOUT IS ACTIVE - Ignoring completion detection:", result.message);
				}

				// Detectar datos del usuario en mensajes del usuario - mejorado
				let userUpdated = false;

				// Mejorado regex para edad
				const userAgeMatch = result.message.match(/(?:I'm|I am|my age is)\s*(\d{1,2})\s*(?:years old|yo|yrs?|años?)|(\d{1,2})\s*(?:years old|yo|yrs?|años?)/i);
				if (userAgeMatch) {
					const age = userAgeMatch[1] || userAgeMatch[2];
					setUserAge(Number(age));
					userUpdated = true;
					console.log("DETECTED AGE:", age);
				}

				// Mejorado regex para peso
				const userWeightMatch = result.message.match(/(?:weight is|weigh|I'm)\s*(\d{2,3})\s*(kg|kilograms|kilos|lbs|pounds)|(\d{2,3})\s*(kg|kilograms|kilos|lbs|pounds)/i);
				if (userWeightMatch) {
					const weight = userWeightMatch[1] || userWeightMatch[3];
					const unit = userWeightMatch[2] || userWeightMatch[4];
					setUserWeight(`${weight} ${unit}`);
					userUpdated = true;
					console.log("DETECTED WEIGHT:", weight, unit);
				}

				// Mejorado regex para altura
				const userHeightMatch = result.message.match(
					/(?:height is|I'm|tall)\s*(\d{1,3})\s*(cm|centimeters)|(\d{1,3})\s*(cm|centimeters)|\d'\d{1,2}"|\d\s*feet\s*\d{1,2}\s*inches/i
				);
				if (userHeightMatch) {
					setUserHeight(userHeightMatch[0]);
					userUpdated = true;
					console.log("DETECTED HEIGHT:", userHeightMatch[0]);
				}

				// Mejorado regex para sexo
				const userSexMatch = result.message.match(/(?:I'm a?|I am a?)\s*(male|female|man|woman)|(male|female|man|woman)/i);
				if (userSexMatch) {
					const sex = userSexMatch[1] || userSexMatch[2];
					setUserSex(sex.toLowerCase());
					userUpdated = true;
					console.log("DETECTED SEX:", sex);
				}

				if (userUpdated) {
					(conversation as any).sendContextualUpdate?.(
						`route: ${route}\n` +
						(userAge ? `user_age: ${userAge}\n` : "") +
						(userWeight ? `user_weight: ${userWeight}\n` : "") +
						(userHeight ? `user_height: ${userHeight}\n` : "") +
						(userSex ? `user_sex: ${userSex}\n` : "") +
						(pushupGoal ? `pushup_goal: ${pushupGoal}\n` : "") +
						(timePerPushup ? `time_per_pushup: ${timePerPushup}\n` : "") +
						(workoutResult ? `workout_result: ${workoutResult}` : "")
					);
				}
			}
		},
	});

	// Función para manejar cuando el workout del componente Pushups se complete
	const handleWorkoutComplete = useCallback((result: { reps: number, timeElapsed: number, success: boolean, workoutSummary?: any }) => {
		console.log("WORKOUT COMPLETED FROM PUSHUPS COMPONENT:", result);

		// Crear mensaje para la IA con el resumen completo
		const workoutMessage = result.workoutSummary
			? `workout completed: ${JSON.stringify(result.workoutSummary, null, 2)}`
			: `Completed ${result.reps} push-ups in ${result.timeElapsed} seconds. ${result.success ? 'Success!' : 'Keep trying!'}`;

		setWorkoutResult(workoutMessage);
		setRoute("result");

		// Enviar el resumen completo a la IA como mensaje del usuario
		conversation.sendUserMessage(workoutMessage);
	}, [conversation]);

	async function startConversation() {
		const hasPermission = await requestMicrophonePermission();
		if (!hasPermission) {
			alert("No permission");
			return;
		}
		const signedUrl = await getSignedUrl();
		const conversationId = await conversation.startSession({ signedUrl });
		console.log(conversationId);
	}

	const stopConversation = useCallback(async () => {
		await conversation.endSession();
	}, [conversation]);

	return (
		<>
			<div className={"flex justify-center items-center gap-x-4"}>
				<Card className={"rounded-3xl"}>
					<CardContent>
						<CardHeader>
							<CardTitle className={"text-center"}>
								{conversation.status === "connected"
									? conversation.isSpeaking
										? `Agent is speaking`
										: "Agent is listening"
									: "Disconnected"}
							</CardTitle>
						</CardHeader>
						<div className={"flex flex-col gap-y-4 text-center"}>
							{/* Debug info */}
							<div className="text-xs text-gray-500">
								Route: {route} | Workout Active: {workoutActive ? 'Yes' : 'No'}
							</div>

							<div
								className={cn(
									"orb my-16 mx-12",
									conversation.status === "connected" && conversation.isSpeaking
										? "orb-active animate-orb"
										: conversation.status === "connected"
											? "animate-orb-slow orb-inactive"
											: "orb-inactive"
								)}
							></div>

							<Button
								variant={"outline"}
								className={"rounded-full"}
								size={"lg"}
								disabled={conversation !== null && conversation.status === "connected"}
								onClick={startConversation}
							>
								Start conversation
							</Button>
							<Button
								variant={"outline"}
								className={"rounded-full"}
								size={"lg"}
								disabled={conversation === null}
								onClick={stopConversation}
							>
								End conversation
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Workout Modal - Solo muestra datos del usuario */}
			<Dialog open={showWorkoutModal} onOpenChange={setShowWorkoutModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>User Data</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<p>Age: {userAge ?? "Not provided"}</p>
						<p>Weight: {userWeight ?? "Not provided"}</p>
						<p>Height: {userHeight ?? "Not provided"}</p>
						<p>Sex: {userSex ?? "Not provided"}</p>
						<p>Push-up Goal: {pushupGoal ?? "Not provided"}</p>
						<p>Time per Push-up: {timePerPushup ? `${timePerPushup} seconds` : "Not provided"}</p>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={showPushupsModal} onOpenChange={setShowPushupsModal}>
				<DialogContent className="max-w-4xl">
					<DialogHeader>
						<DialogTitle>Push-ups Session - {route}</DialogTitle>
					</DialogHeader>
					<div className="text-center">
						{route === "workout" ? (
							<div>
								<p>Ready for push-ups: Aim for {pushupGoal} push-ups at {timePerPushup} seconds each</p>
								<p className="text-sm text-gray-500 mt-2">Tell the AI when you want to start</p>
							</div>
						) : route === "workout_pushups" ? (
							<Pushups
								pushups_goal={pushupGoal ?? 0}
								time_per_pushup={timePerPushup ?? 0}
								onWorkoutComplete={handleWorkoutComplete}
							/>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			{/* Result Modal */}
			<Dialog open={showResultModal} onOpenChange={setShowResultModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Workout Result</DialogTitle>
					</DialogHeader>
					<p>{workoutResult || "No result provided"}</p>
				</DialogContent>
			</Dialog>
		</>
	);
}
