// 文件目录星标 — localStorage 持久化,所有引用方共享同一份 reactive state
import { ref, computed } from 'vue';
import { useFilesStore } from '@/stores/files';

const STAR_KEY = 'files.starred.v1';
const stars = ref([]);
let loaded = false;

function load() {
    if (loaded) return;
    try {
        const raw = localStorage.getItem(STAR_KEY);
        stars.value = raw ? JSON.parse(raw) : [];
    } catch { stars.value = []; }
    loaded = true;
}
function save() {
    try { localStorage.setItem(STAR_KEY, JSON.stringify(stars.value)); } catch {}
}

export function useFileStars() {
    load();
    const files = useFilesStore();

    const isCurrentStarred = computed(() => stars.value.includes(files.cwd));

    function toggleCurrent() {
        const p = files.cwd;
        if (!p) return;
        const i = stars.value.indexOf(p);
        if (i >= 0) stars.value.splice(i, 1);
        else stars.value.push(p);
        save();
    }
    function removeStar(p) {
        const i = stars.value.indexOf(p);
        if (i >= 0) { stars.value.splice(i, 1); save(); }
    }

    return { stars, isCurrentStarred, toggleCurrent, removeStar };
}
