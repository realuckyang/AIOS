<template>
  <div class="dot-matrix flex shrink-0 flex-col gap-4 px-4 pb-4 pt-5 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:pl-[60px] sm:pb-5 sm:pt-[30px]">
    <div class="flex items-center gap-3 text-xl font-bold text-[#1a2a40] sm:gap-4 sm:text-2xl">
      <button class="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-black/5 active:scale-90 sm:h-9 sm:w-9" @click="$emit('prev-month')">◄</button>
      <span class="tracking-[0.15em]">{{ displayMonth }}</span>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-black/5 active:scale-90 sm:h-9 sm:w-9"
        :class="{ 'cursor-not-allowed opacity-30': isCurrentMonth }"
        :disabled="isCurrentMonth"
        @click="$emit('next-month')"
      >►</button>
    </div>

    <div class="summary-box flex justify-between gap-3 rounded border-2 border-dashed border-[rgba(82,113,255,0.4)] bg-white/60 px-3 py-2 shadow-[inset_0_0_10px_rgba(0,0,0,0.02)] sm:gap-[30px] sm:px-6 sm:py-3">
      <div class="flex flex-col items-end">
        <span class="mb-0.5 text-[10px] text-gray-500 sm:mb-1 sm:text-xs">{{ t('finance_income') }}</span>
        <span class="text-sm font-bold text-green-700 sm:text-lg">+ {{ fmtAmt(totalIncome) }}</span>
      </div>
      <div class="flex flex-col items-end border-l border-dashed border-[rgba(82,113,255,0.3)] pl-3 sm:pl-[30px]">
        <span class="mb-0.5 text-[10px] text-gray-500 sm:mb-1 sm:text-xs">{{ t('finance_expense') }}</span>
        <span class="text-sm font-bold text-red-700 sm:text-lg">- {{ fmtAmt(totalExpense) }}</span>
      </div>
      <div class="flex flex-col items-end border-l border-dashed border-[rgba(82,113,255,0.3)] pl-3 sm:pl-[30px]">
        <span class="mb-0.5 text-[10px] font-bold text-blue-900 sm:mb-1 sm:text-xs">{{ t('finance_balance') }}</span>
        <span class="text-base font-black text-black underline decoration-double sm:text-2xl">{{ fmtAmt(endingBalance) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../_shared/i18n.js';

defineProps({
  displayMonth: { type: String, required: true },
  isCurrentMonth: { type: Boolean, required: true },
  totalIncome: { type: Number, required: true },
  totalExpense: { type: Number, required: true },
  endingBalance: { type: Number, required: true },
  fmtAmt: { type: Function, required: true }
});

defineEmits(['prev-month', 'next-month']);

const { t } = useI18n();
</script>
