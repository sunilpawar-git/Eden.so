/**
 * User Model - Strict type definition
 */
export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
    createdAt: Date;
}

/**
 * Create a User from Firebase Auth user data
 */
export function createUserFromAuth(
    uid: string,
    displayName: string | null,
    email: string | null,
    photoURL: string | null
): User {
    return {
        id: uid,
        name: displayName ?? 'Anonymous',
        email: email ?? '',
        avatarUrl: photoURL ?? '',
        createdAt: new Date(),
    };
}
