// Helper to convert string to buffer
function str2ab(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

// Helper to convert buffer to hex string
function ab2hex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Helper to convert hex string to buffer
function hex2ab(hexString) {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
}

// Generate a random salt
export function generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
}

// Hash a password using PBKDF2
export async function hashPassword(password, salt = generateSalt()) {
    // Convert password to buffer
    const passwordBuffer = str2ab(password);

    // Import the password as a key
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer, { name: 'PBKDF2' },
        false, ['deriveBits']
    );

    // Derive bits using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits({
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        passwordKey,
        256
    );

    // Convert to hex for storage
    const saltHex = ab2hex(salt);
    const hashHex = ab2hex(derivedBits);

    // Return both salt and hash for storage
    return `${saltHex}:${hashHex}`;
}

// Compare a password against a stored hash
export async function comparePassword(password, storedValue) {
    if (!storedValue || storedValue === '') {
        return password === '';
    }

    try {
        // Split the stored value to get salt and hash
        const [saltHex, hashHex] = storedValue.split(':');

        // Convert salt hex to buffer
        const salt = hex2ab(saltHex);

        // Hash the input password with the same salt
        const passwordBuffer = str2ab(password);

        // Import the password as a key
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            passwordBuffer, { name: 'PBKDF2' },
            false, ['deriveBits']
        );

        // Derive bits using PBKDF2
        const derivedBits = await crypto.subtle.deriveBits({
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            passwordKey,
            256
        );

        // Convert derived bits to hex
        const inputHashHex = ab2hex(derivedBits);

        // Compare the computed hash with the stored hash
        return inputHashHex === hashHex;
    } catch (error) {
        console.error('Error comparing passwords:', error);
        return false;
    }
}

export default {
    hashPassword,
    comparePassword,
    generateSalt
};