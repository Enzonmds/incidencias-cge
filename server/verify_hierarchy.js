
import sequelize from './src/config/db.js';
import { Ticket, User } from './src/models/index.js';
import { getTickets } from './src/controllers/ticketController.js';

// Mock Express Request/Response
const mockReq = (user, query = {}) => ({
    user,
    query
});

const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; return res; };
    return res;
};

const runVerify = async () => {
    try {
        await sequelize.authenticate();

        // 1. Setup Users
        const jefeSistemas = await User.findOne({ where: { role: 'JEFE', department: 'SISTEMAS' } });
        // Ensure Dept is set (Seed might differ slightly if I didn't restart seed, but let's check)
        if (!jefeSistemas) console.log("❌ Jefe Sistemas not found");

        const subdirector = await User.findOne({ where: { role: 'SUBDIRECTOR' } });
        const techTesoreria = await User.findOne({ where: { role: 'TECHNICAL_SUPPORT', department: 'TESORERIA' } });

        // 2. Setup Tickets (Ensure mixed bag)
        // Check if we have tickets for SISTEMAS and TESORERIA
        const countSis = await Ticket.count({ where: { cola_atencion: 'SISTEMAS' } });
        const countTes = await Ticket.count({ where: { cola_atencion: 'TESORERIA' } });
        console.log(`📊 DB State: Sistemas Tickets: ${countSis}, Tesorería Tickets: ${countTes}`);

        // 3. Test JEFE (Sistemas)
        if (jefeSistemas) {
            console.log("\n🧪 Testing JEFE (Sistemas)...");
            const req = mockReq(jefeSistemas);
            const res = mockRes();
            await getTickets(req, res);
            const visible = res.body;
            const nonSistemas = visible.filter(t => t.cola_atencion !== 'SISTEMAS');
            console.log(`   Visible: ${visible.length}. Violations: ${nonSistemas.length}`);
            if (nonSistemas.length > 0) console.log("   ❌ JEFE sees tickets from: " + [...new Set(nonSistemas.map(t => t.cola_atencion))]);
            else console.log("   ✅ JEFE sees ONLY Sistemas.");
        }

        // 4. Test TECH (Tesorería)
        if (techTesoreria) {
            console.log("\n🧪 Testing TECH (Tesorería)...");
            const req = mockReq(techTesoreria);
            const res = mockRes();
            await getTickets(req, res);
            const visible = res.body;
            const nonTesoreria = visible.filter(t => t.cola_atencion !== 'TESORERIA');
            console.log(`   Visible: ${visible.length}. Violations: ${nonTesoreria.length}`);
            if (nonTesoreria.length > 0) console.log("   ❌ TECH sees tickets from: " + [...new Set(nonTesoreria.map(t => t.cola_atencion))]);
            else console.log("   ✅ TECH sees ONLY Tesorería.");
        }

        // 5. Test SUBDIRECTOR
        if (subdirector) {
            console.log("\n🧪 Testing SUBDIRECTOR...");
            const req = mockReq(subdirector);
            const res = mockRes();
            await getTickets(req, res);
            const visible = res.body;
            const totalTickets = await Ticket.count();
            console.log(`   Visible: ${visible.length} / Global Total: ${totalTickets}`);
            if (visible.length === totalTickets) console.log("   ✅ SUBDIRECTOR sees ALL.");
            else console.log("   ⚠️ SUBDIRECTOR seeing subset? (Might be pagination/limit if implemented, or logic mismatch)");
        }

    } catch (e) {
        console.error(e);
    }
};

runVerify();
