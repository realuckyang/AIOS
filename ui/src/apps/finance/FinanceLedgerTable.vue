<template>
  <div class="passbook-table-wrapper mx-3 mb-4 flex-1 overflow-y-auto rounded border border-[rgba(82,113,255,0.4)] bg-white/40 shadow-[0_2px_10px_rgba(0,0,0,0.02)] sm:mx-10 sm:mb-10 sm:ml-[60px]">
    <table class="dot-matrix w-full border-collapse">
      <thead>
        <tr>
          <th class="sticky top-0 z-10 w-[12%] border border-[rgba(82,113,255,0.4)] bg-[rgba(82,113,255,0.15)] px-2 py-3 text-center text-xs font-bold text-[#1a2a40] backdrop-blur-[4px] sm:px-2 sm:py-3 sm:text-sm">{{ t('finance_date') }}</th>
          <th class="sticky top-0 z-10 border border-[rgba(82,113,255,0.4)] bg-[rgba(82,113,255,0.15)] px-2 py-3 text-center text-xs font-bold text-[#1a2a40] backdrop-blur-[4px] sm:px-2 sm:py-3 sm:text-sm">{{ t('finance_narrative') }}</th>
          <th class="sticky top-0 z-10 w-[15%] border border-[rgba(82,113,255,0.4)] bg-[rgba(82,113,255,0.15)] px-2 py-3 text-center text-xs font-bold text-[#1a2a40] backdrop-blur-[4px] sm:px-2 sm:py-3 sm:text-sm">{{ t('finance_withdrawal') }}</th>
          <th class="sticky top-0 z-10 w-[15%] border border-[rgba(82,113,255,0.4)] bg-[rgba(82,113,255,0.15)] px-2 py-3 text-center text-xs font-bold text-[#1a2a40] backdrop-blur-[4px] sm:px-2 sm:py-3 sm:text-sm">{{ t('finance_deposit') }}</th>
          <th class="sticky top-0 z-10 w-[10%] border border-[rgba(82,113,255,0.4)] bg-[rgba(82,113,255,0.15)] px-2 py-3 text-center text-xs font-bold text-[#1a2a40] backdrop-blur-[4px] sm:px-2 sm:py-3 sm:text-sm">{{ t('finance_operation') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" class="group transition-colors hover:bg-[rgba(82,113,255,0.05)]">
          <td class="border border-[rgba(82,113,255,0.3)] px-2 py-2 text-center text-[13px] sm:px-4 sm:py-3 sm:text-[15px]" @dblclick="startEdit(row, 'date')">
            <input
              v-if="editing.active && editing.id === row.id && editing.field === 'date'"
              v-model="editing.value"
              class="inline-input w-full border-0 border-b border-dashed border-[rgba(11,28,103,0.3)] bg-transparent px-1 py-0.5 text-center text-inherit outline-none transition-all placeholder:italic placeholder:text-[rgba(11,28,103,0.3)] focus:border-solid focus:border-[#0b1c67] focus:bg-white/50"
              @blur="saveEdit"
              @keyup.enter="saveEdit"
              @keyup.escape="cancelEdit"
            />
            <span v-else>{{ fmtDate(row.date) }}</span>
          </td>

          <td class="border border-[rgba(82,113,255,0.3)] px-2 py-2 text-center text-[13px] sm:px-4 sm:py-3 sm:text-[15px]" @dblclick="startEdit(row, 'note')">
            <input
              v-if="editing.active && editing.id === row.id && editing.field === 'note'"
              v-model="editing.value"
              class="inline-input w-full border-0 border-b border-dashed border-[rgba(11,28,103,0.3)] bg-transparent px-1 py-0.5 text-center text-inherit outline-none transition-all placeholder:italic placeholder:text-[rgba(11,28,103,0.3)] focus:border-solid focus:border-[#0b1c67] focus:bg-white/50"
              @blur="saveEdit"
              @keyup.enter="saveEdit"
              @keyup.escape="cancelEdit"
            />
            <span v-else>{{ row.note || (row.type === 'income' ? t('finance_default_income_note') : t('finance_default_expense_note')) }}</span>
          </td>

          <td class="border border-[rgba(82,113,255,0.3)] px-2 py-2 text-right text-[13px] font-bold sm:px-4 sm:py-3 sm:text-[15px]" :class="row.type === 'expense' ? 'text-red-700' : ''" @dblclick="row.type === 'expense' && startEdit(row, 'amount')">
            <input
              v-if="editing.active && editing.id === row.id && editing.field === 'amount' && row.type === 'expense'"
              v-model="editing.value"
              class="inline-input w-full border-0 border-b border-dashed border-[rgba(11,28,103,0.3)] bg-transparent px-1 py-0.5 text-right font-bold text-red-700 outline-none transition-all placeholder:italic placeholder:text-[rgba(11,28,103,0.3)] focus:border-solid focus:border-[#0b1c67] focus:bg-white/50"
              @blur="saveEdit"
              @keyup.enter="saveEdit"
              @keyup.escape="cancelEdit"
            />
            <span v-else>{{ row.type === 'expense' ? '-' + fmtAmt(row.amount) : '' }}</span>
          </td>

          <td class="border border-[rgba(82,113,255,0.3)] px-2 py-2 text-right text-[13px] font-bold sm:px-4 sm:py-3 sm:text-[15px]" :class="row.type === 'income' ? 'text-green-700' : ''" @dblclick="row.type === 'income' && startEdit(row, 'amount')">
            <input
              v-if="editing.active && editing.id === row.id && editing.field === 'amount' && row.type === 'income'"
              v-model="editing.value"
              class="inline-input w-full border-0 border-b border-dashed border-[rgba(11,28,103,0.3)] bg-transparent px-1 py-0.5 text-right font-bold text-green-700 outline-none transition-all placeholder:italic placeholder:text-[rgba(11,28,103,0.3)] focus:border-solid focus:border-[#0b1c67] focus:bg-white/50"
              @blur="saveEdit"
              @keyup.enter="saveEdit"
              @keyup.escape="cancelEdit"
            />
            <span v-else>{{ row.type === 'income' ? '+' + fmtAmt(row.amount) : '' }}</span>
          </td>

          <td class="border border-[rgba(82,113,255,0.3)] px-2 py-2 text-center text-[13px] sm:px-4 sm:py-3 sm:text-[15px]">
            <button
              class="rounded border border-red-700 bg-transparent px-2 py-1 text-[11px] font-bold text-red-700 opacity-100 transition-all transition-opacity hover:bg-[#0b1c67] hover:text-white hover:shadow-[0_2px_4px_rgba(0,0,0,0.2)] active:translate-y-px sm:px-3 sm:text-xs sm:opacity-0 sm:group-hover:opacity-100"
              @click="remove(row.id)"
            >{{ t('common_delete') }}</button>
          </td>
        </tr>

        <tr class="bg-[rgba(82,113,255,0.08)]">
          <td class="border border-[rgba(82,113,255,0.3)] px-2 py-2 text-center text-[13px] sm:px-4 sm:py-3 sm:text-[15px]">
            <input v-model="form.newDate" type="text" class="inline-input w-full border-0 border-b border-dashed border-[rgba(11,28,103,0.3)] bg-transparent px-1 py-0.5 text-center text-inherit outline-none transition-all placeholder:italic placeholder:text-[rgba(11,28,103,0.3)] focus:border-solid focus:border-[#0b1c67] focus:bg-white/50" :placeholder="todayStr" />
          </td>
          <td class="border border-[rgba(82,113,255,0.3)] px-2 py-2 text-center text-[13px] sm:px-4 sm:py-3 sm:text-[15px]">
            <input v-model="form.newNote" type="text" class="inline-input w-full border-0 border-b border-dashed border-[rgba(11,28,103,0.3)] bg-transparent px-1 py-0.5 text-center text-inherit outline-none transition-all placeholder:italic placeholder:text-[rgba(11,28,103,0.3)] focus:border-solid focus:border-[#0b1c67] focus:bg-white/50" :placeholder="t('finance_note_placeholder')" @keyup.enter="save" />
          </td>
          <td class="border border-[rgba(82,113,255,0.3)] px-2 py-2 text-right text-[13px] sm:px-4 sm:py-3 sm:text-[15px]">
            <input v-model="form.newWithdraw" type="text" class="inline-input w-full border-0 border-b border-dashed border-[rgba(11,28,103,0.3)] bg-transparent px-1 py-0.5 text-right font-bold text-red-700 outline-none transition-all placeholder:italic placeholder:text-[rgba(11,28,103,0.3)] focus:border-solid focus:border-[#0b1c67] focus:bg-white/50" placeholder="0.00" @keyup.enter="save" />
          </td>
          <td class="border border-[rgba(82,113,255,0.3)] px-2 py-2 text-right text-[13px] sm:px-4 sm:py-3 sm:text-[15px]">
            <input v-model="form.newDeposit" type="text" class="inline-input w-full border-0 border-b border-dashed border-[rgba(11,28,103,0.3)] bg-transparent px-1 py-0.5 text-right font-bold text-green-700 outline-none transition-all placeholder:italic placeholder:text-[rgba(11,28,103,0.3)] focus:border-solid focus:border-[#0b1c67] focus:bg-white/50" placeholder="0.00" @keyup.enter="save" />
          </td>
          <td class="border border-[rgba(82,113,255,0.3)] px-2 py-2 text-center text-[13px] sm:px-4 sm:py-3 sm:text-[15px]">
            <button class="rounded border border-[#0b1c67] bg-transparent px-2 py-1 text-[11px] font-bold text-[#0b1c67] transition-all hover:bg-[#0b1c67] hover:text-white hover:shadow-[0_2px_4px_rgba(0,0,0,0.2)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-30 sm:px-3 sm:text-xs" :disabled="saving || (!form.newWithdraw && !form.newDeposit)" @click="save">{{ t('common_save') }}</button>
          </td>
        </tr>

        <tr v-for="n in 6" :key="'e'+n"><td v-for="c in 5" :key="c" class="h-8 border border-[rgba(82,113,255,0.3)] px-2 py-2 text-[13px] sm:px-4 sm:py-3 sm:text-[15px]"></td></tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { useI18n } from '../_shared/i18n.js';

defineProps({
  rows: { type: Array, required: true },
  editing: { type: Object, required: true },
  form: { type: Object, required: true },
  todayStr: { type: String, required: true },
  saving: { type: Boolean, required: true },
  fmtDate: { type: Function, required: true },
  fmtAmt: { type: Function, required: true },
  startEdit: { type: Function, required: true },
  saveEdit: { type: Function, required: true },
  cancelEdit: { type: Function, required: true },
  remove: { type: Function, required: true },
  save: { type: Function, required: true }
});

const { t } = useI18n();
</script>

<style scoped>
.passbook-table-wrapper::-webkit-scrollbar { width: 8px; }
.passbook-table-wrapper::-webkit-scrollbar-track { background: transparent; }
.passbook-table-wrapper::-webkit-scrollbar-thumb { background: rgba(82,113,255,0.2); border-radius: 4px; }
.passbook-table-wrapper::-webkit-scrollbar-thumb:hover { background: rgba(82,113,255,0.4); }
</style>
