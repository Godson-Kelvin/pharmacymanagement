const users = [
    {
        username: "admin",
        password: "admin123",
        email: "admin@pharmaflow.com",
        role: "admin",
        displayName: "Admin User",
    },
    {
        username: "cashier",
        password: "cashier123",
        email: "cashier@pharmaflow.com",
        role: "cashier",
        displayName: "Cashier User",
    },
];

export function authenticateUser(username, password) {
    const user = users.find(
        (u) => u.username === username && u.password === password
    );
    if (user) {
        const { password: _, ...safeUser } = user;
        const token = JSON.stringify({
            username: safeUser.username,
            role: safeUser.role,
            exp: Date.now() + 86400000,
        });
        return { user: safeUser, token };
    }
    return null;
}

export function verifyToken(token) {
    try {
        const data = JSON.parse(token);
        if (data.exp < Date.now()) return null;
        const user = users.find((u) => u.username === data.username);
        if (!user) return null;
        const { password: _, ...safeUser } = user;
        return safeUser;
    } catch {
        return null;
    }
}