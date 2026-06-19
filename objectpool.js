// === OBJECTPOOL.JS ===
// Pool genérico simples para reduzir alocação de objetos descartáveis.

export function createObjectPool(factory, reset = () => {}) {
    const free = [];

    return {
        acquire() {
            return free.length > 0 ? free.pop() : factory();
        },
        release(obj) {
            reset(obj);
            free.push(obj);
        },
        size() {
            return free.length;
        },
    };
}
