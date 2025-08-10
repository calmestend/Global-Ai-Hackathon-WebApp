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
	const [route, setRoute] = useState<"home" | "workout" | "result">("home");
	const [workoutResult, setWorkoutResult] = useState<string>("");

	// User data
	const [userAge, setUserAge] = useState<number | null>(null);
	const [userWeight, setUserWeight] = useState<string | null>(null);
	const [userHeight, setUserHeight] = useState<string | null>(null);
	const [userSex, setUserSex] = useState<string | null>(null);

	// Modals
	const [showWorkoutModal, setShowWorkoutModal] = useState(false);
	const [showResultModal, setShowResultModal] = useState(false);

	// Control de modales según la ruta
	useEffect(() => {
		if (route === "workout") {
			setShowWorkoutModal(true);
			setShowResultModal(false);
		} else if (route === "result") {
			setShowWorkoutModal(false);
			setShowResultModal(true);
		} else if (route === "home") {
			setShowWorkoutModal(false);
			setShowResultModal(false);
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
				// Detección estricta de cambio a workout - solo cuando AI dice la frase exacta
				if (result.message.includes("starting workout")) {
					setRoute("workout");
					(conversation as any).sendContextualUpdate?.(`route: workout`);
				}

				// Detección estricta de cambio a result - solo cuando AI dice la frase exacta
				if (result.message.includes("ending workout")) {
					setRoute("result");
					(conversation as any).sendContextualUpdate?.(`route: result`);
				}
			}

			// Detectar respuestas de ejercicios completados y datos del usuario SOLO de mensajes del USUARIO
			if (result?.source === "user" && typeof result.message === "string") {
				// Solo cambiar a result cuando el usuario realmente dice que completó algo
				if (/(completed|finished|done|accomplished|achieved).*(push[- ]?ups|squats|plank|pull[- ]?ups|burpees|lunges|sit[- ]?ups|workout|exercise)/i.test(result.message)) {
					setRoute("result");
					setWorkoutResult(result.message);
					(conversation as any).sendContextualUpdate?.(
						`route: result\nworkout_result: ${result.message}`
					);
				}

				// Detectar datos del usuario en mensajes del usuario
				let userUpdated = false;

				const userAgeMatch = result.message.match(/\b(\d{1,2})\s*(?:years old|yo|yrs?|años?)\b/i);
				if (userAgeMatch) {
					setUserAge(Number(userAgeMatch[1]));
					userUpdated = true;
				}

				const userWeightMatch = result.message.match(/\b(\d{2,3})\s*(kg|kilograms|kilos|lbs|pounds|libras)\b/i);
				if (userWeightMatch) {
					setUserWeight(`${userWeightMatch[1]} ${userWeightMatch[2]}`);
					userUpdated = true;
				}

				const userHeightMatch = result.message.match(
					/\b(\d{1,3}\s*(?:cm|centimeters|centimetros)|\d'\d{1,2}"|\d\s*feet\s*\d{1,2}\s*inches|\d\s*pies\s*\d{1,2}\s*pulgadas)\b/i
				);
				if (userHeightMatch) {
					setUserHeight(userHeightMatch[0]);
					userUpdated = true;
				}

				const userSexMatch = result.message.match(/\b(male|female|man|woman|hombre|mujer)\b/i);
				if (userSexMatch) {
					setUserSex(userSexMatch[1].toLowerCase());
					userUpdated = true;
				}

				if (userUpdated) {
					(conversation as any).sendContextualUpdate?.(
						`route: ${route}\n` +
						(userAge ? `user_age: ${userAge}\n` : "") +
						(userWeight ? `user_weight: ${userWeight}\n` : "") +
						(userHeight ? `user_height: ${userHeight}\n` : "") +
						(userSex ? `user_sex: ${userSex}\n` : "") +
						(workoutResult ? `workout_result: ${workoutResult}` : "")
					);
				}
			}
		},
	});

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

			{/* Workout Modal */}
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
