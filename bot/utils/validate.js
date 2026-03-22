function sanitizeString(str, maxLength = 100) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength).replace(/[<>@&]/g, '');
}

function validateAmount(amount, min = 1, max = 10_000_000) {
    if (!Number.isInteger(amount)) return { valid: false, msg: 'Amount must be a whole number.' };
    if (amount < min) return { valid: false, msg: `Amount must be at least ${min}.` };
    if (amount > max) return { valid: false, msg: `Amount cannot exceed ${max.toLocaleString()}.` };
    return { valid: true };
}

function validateUsername(name) {
    if (!name || name.length < 1) return { valid: false, msg: 'Name cannot be empty.' };
    if (name.length > 32) return { valid: false, msg: 'Name must be under 32 characters.' };
    if (/[<>@#&]/.test(name)) return { valid: false, msg: 'Name contains invalid characters.' };
    return { valid: true };
}

module.exports = { sanitizeString, validateAmount, validateUsername };