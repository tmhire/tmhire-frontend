import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Configure backend API URL from environment or use default
const BACKEND_URL = process.env.BACKEND_URL || "https://tmhire-backend.onrender.com";

/**
 * Safely sends the Google token to the backend and gets an access token
 */
async function exchangeGoogleToken(idToken: string) {
  console.log("Exchanging Google ID token for backend access token");
  
  try {
    const response = await fetch(`${BACKEND_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        token: idToken
      })    });
    
    console.log(`Backend response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend auth error (${response.status}): ${errorText}`);
      return null;
    }
    
    // Parse the response
    const data = await response.json();
    
    // Validate the response structure
    if (!data.access_token || !data.token_type) {
      console.error("Backend response missing required token fields:", data);
      return null;
    }
    
    console.log("Successfully obtained backend token");
    return {
      accessToken: data.access_token,
      tokenType: data.token_type
    };
  } catch (error) {
    console.error("Failed to exchange token with backend:", 
      error instanceof Error ? error.message : String(error));
    return null;
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        // Store the user ID in the token
        token.userId = user.id;
        // Handle Google authentication specifically
        if (account.provider === 'google' && account.id_token) {
          // Exchange the Google token for a backend token
          const backendAuth = await exchangeGoogleToken(account.id_token);
          
          if (backendAuth) {
            // Store the backend tokens in the JWT
            token.backendAccessToken = backendAuth.accessToken;
            token.backendTokenType = backendAuth.tokenType;
          }
        }
      }
      console.log("token",token)
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        // Add user ID to the session
        // @ts-expect-error - Adding custom property to session.user
        session.user.id = token.userId;
        console.log(`Session : ${session}`);
        // Add backend access token to the session
        // @ts-expect-error - Adding custom properties
        session.backendAccessToken = token.backendAccessToken;
        // @ts-expect-error - Adding custom properties
        session.backendTokenType = token.backendTokenType;
        
        // Log authentication status
        const hasToken = !!token.backendAccessToken;
        console.log(`Session authentication status: ${hasToken ? 'Authenticated' : 'Not authenticated'} with backend`);
      }
      
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
  // Increase JWT session lifetime
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    // You can customize this if needed
    maxAge: 30 * 24 * 60 * 60, // 30 days
  }
});

export { handler as GET, handler as POST }; 