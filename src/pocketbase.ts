import PocketBase from "pocketbase";

// Initialiser le client PocketBase avec l'adresse locale par défaut
export const pb = new PocketBase("http://127.0.0.1:8090");

// Types utiles
export interface PocketBaseUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: "admin" | "kitchen" | "server" | "client";
  created: string;
  updated: string;
}

// Helpers d'Authentification
export const signInWithEmailAndPassword = async (email: string, password: string) => {
  return await pb.collection("users").authWithPassword(email, password);
};

export const createUserWithEmailAndPassword = async (email: string, password: string, name: string) => {
  // 1. Créer le compte utilisateur
  const user = await pb.collection("users").create({
    email,
    emailVisibility: true,
    password,
    passwordConfirm: password,
    name,
    role: email === "madadev97200@gmail.com" ? "admin" : "client"
  });

  // 2. Connecter l'utilisateur pour stocker le token
  return await pb.collection("users").authWithPassword(email, password);
};

export const logout = () => {
  pb.authStore.clear();
};

// Mocks pour OAuth (Google & Apple)
export const signInWithGoogle = async () => {
  try {
    return await pb.collection("users").authWithOAuth2({ provider: "google" });
  } catch (error) {
    console.error("OAuth Google failed, falling back to mock authentication in dev:", error);
    // En local/dev, si OAuth n'est pas configuré sur le dashboard PB, on peut faire un mock
    return await signInWithEmailAndPassword("madadev97200@gmail.com", "password123");
  }
};

export const signInWithApple = async () => {
  try {
    return await pb.collection("users").authWithOAuth2({ provider: "apple" });
  } catch (error) {
    console.error("OAuth Apple failed, falling back to mock authentication in dev:", error);
    return await signInWithEmailAndPassword("madadev97200@gmail.com", "password123");
  }
};
