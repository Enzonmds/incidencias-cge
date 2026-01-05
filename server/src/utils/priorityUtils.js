export const calculatePriority = (user) => {
    // 1. Logged / Verified Users (Internal Staff/Militar)
    if (user.role === 'USER' || user.role === 'ADMIN' || user.role === 'TECHNICAL_SUPPORT' || user.role === 'HUMAN_ATTENTION') {
        // However, we want to distinguish "Final User". 
        // If they have a verified DNI match, they are High Priority.
        return 'HIGH';
    }

    // 2. Entities (External Orgs)
    if (user.role === 'ENTITY' || user.whatsapp_temp_role === 'ENTIDAD') {
        return 'MEDIUM';
    }

    // 3. Guests / Anonymous / Not Logged
    return 'LOW';
};
