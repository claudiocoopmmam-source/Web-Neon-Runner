// === ASSETMANAGER.JS ===
// Responsabilidade: registrar e acompanhar o carregamento de imagens e áudios.
// Não conhece gameplay; só oferece utilitários de preload e progresso.

const trackedAssets = [];
const progressListeners = new Set();

let loadedCount = 0;
let failedCount = 0;

function _notifyProgress() {
    const snapshot = getAssetProgress();
    progressListeners.forEach(listener => {
        try {
            listener(snapshot);
        } catch (err) {
            console.error('Asset progress listener failed:', err);
        }
    });
}

function _trackAsset(asset, promise, type, src) {
    const record = {
        asset,
        type,
        src,
        promise,
        status: 'loading',
    };

    trackedAssets.push(record);
    promise.then((ok) => {
        record.status = ok ? 'loaded' : 'failed';
        if (ok) loadedCount += 1;
        else failedCount += 1;
        _notifyProgress();
    });

    _notifyProgress();
    return asset;
}

export function createTrackedImage(src, onLoad) {
    const img = new Image();
    img.decoding = 'async';

    const promise = new Promise((resolve) => {
        if (typeof onLoad === 'function') {
            img.addEventListener('load', onLoad, { once: true });
        }
        img.addEventListener('load', () => resolve(true), { once: true });
        img.addEventListener('error', () => resolve(false), { once: true });
    });

    img.src = src;
    return _trackAsset(img, promise, 'image', src);
}

export function createTrackedAudio(src, { loop = false, volume = 1 } = {}) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = loop;
    audio.volume = volume;

    const promise = new Promise((resolve) => {
        let settled = false;
        const done = (ok) => {
            if (settled) return;
            settled = true;
            resolve(ok);
        };

        audio.addEventListener('loadeddata', () => done(true), { once: true });
        audio.addEventListener('canplaythrough', () => done(true), { once: true });
        audio.addEventListener('error', () => done(false), { once: true });
    });

    audio.src = src;
    if (typeof audio.load === 'function') audio.load();

    return _trackAsset(audio, promise, 'audio', src);
}

export function getAssetProgress() {
    const total = trackedAssets.length;
    const settled = loadedCount + failedCount;
    return {
        total,
        loaded: loadedCount,
        failed: failedCount,
        pending: Math.max(0, total - settled),
        ready: total > 0 && settled >= total,
    };
}

export function onAssetProgress(listener) {
    progressListeners.add(listener);
    listener(getAssetProgress());
    return () => progressListeners.delete(listener);
}

export async function waitForAssets() {
    await Promise.allSettled(trackedAssets.map(record => record.promise));
    return getAssetProgress();
}
