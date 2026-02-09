
export const calculateMatrixPriority = (impact, urgency) => {
    // Base Scores (1-3 scale converted to 0-100 base)
    // Low: 10, Medium: 50, High: 90
    const scoreMap = { 'LOW': 10, 'MEDIUM': 50, 'HIGH': 90 };

    // Default to Low/10 if missing
    const impactScore = scoreMap[impact] || 10;
    const urgencyScore = scoreMap[urgency] || 10;

    // Technical Priority (Avg)
    return (impactScore + urgencyScore) / 2;
};

const getRankWeight = (grade) => {
    if (!grade) return 10; // Default / Civilian / Unknown

    // VIPs (Generales, Directores) - 100 pts
    if (['GB', 'GD', 'TG', 'CR', 'CY'].includes(grade)) return 100;

    // Senior Officers / Jefes - 50 pts
    if (['TC', 'MY', 'CT', 'SP', 'SA', 'SI'].includes(grade)) return 50;

    // Junior Officers / NCOs - 20 pts
    if (['TP', 'TT', 'ST', 'SG', 'CI', 'CB', 'SV'].includes(grade)) return 20;

    return 10; // Default
};

export const calculatePriority = (user, impact = 'LOW', urgency = 'LOW') => {
    // 1. Technical Base Score
    const techScore = calculateMatrixPriority(impact, urgency);

    // 2. VIP Weight
    // "solicitante_grado" usually comes from Ticket body, but here we might only have User.
    // We need to assume the User model has 'grade' or we check a map.
    // For MVP, checking User.role logic + hypothetical grade field.
    // If User doesn't have grade, we default to 10.
    // Let's assume we pass the grade if available, or fetch it. 
    // Simplified: Check Role.

    let vipScore = 0;

    if (user.role === 'SUBDIRECTOR' || user.role === 'JEFE') vipScore = 80;
    else if (user.role === 'ADMIN') vipScore = 50;
    else vipScore = 10;

    // NOTE: In a real scenario, we would read `user.grado` property.
    // Let's add a todo for that.

    // 3. Final Formula
    // Weight: 60% Technical, 40% Political
    const finalScore = (techScore * 0.6) + (vipScore * 0.4);

    // 4. Map back to ENUM
    if (finalScore >= 80) return 'CRITICAL';
    if (finalScore >= 50) return 'HIGH';
    if (finalScore >= 30) return 'MEDIUM';
    return 'LOW';
};
