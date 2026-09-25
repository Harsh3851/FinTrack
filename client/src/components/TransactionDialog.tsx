import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { Transaction, TransactionInputRaw } from '@fintrack/shared';
import { dataSource } from '../data';
import { useDataMutation } from '../data/queries';
import { Modal } from './ui/Modal';
import { TransactionForm } from './TransactionForm';

interface DialogApi {
  openCreate(): void;
  openEdit(tx: Transaction): void;
}

const DialogContext = createContext<DialogApi | null>(null);

/** One app-wide add/edit dialog, reachable from the header, dashboard and lists. */
export function TransactionDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; tx: Transaction | null }>({
    open: false,
    tx: null,
  });
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const create = useDataMutation((input: TransactionInputRaw) =>
    dataSource.transactions.create(input),
  );
  const update = useDataMutation(({ id, input }: { id: string; input: TransactionInputRaw }) =>
    dataSource.transactions.update(id, input),
  );

  const api = useMemo<DialogApi>(
    () => ({
      openCreate: () => setState({ open: true, tx: null }),
      openEdit: (tx) => setState({ open: true, tx }),
    }),
    [],
  );

  const editing = state.tx;
  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        open={state.open}
        onClose={close}
        title={editing ? 'Edit transaction' : 'Add transaction'}
        description={
          editing ? undefined : 'Record income or an expense. Amounts are in Indian Rupees.'
        }
      >
        <TransactionForm
          key={editing?.id ?? 'new'}
          initial={editing}
          submitLabel={editing ? 'Save changes' : 'Add transaction'}
          onCancel={close}
          onSubmit={async (input) => {
            if (editing) {
              await update.mutateAsync({ id: editing.id, input });
              toast.success('Transaction updated');
            } else {
              await create.mutateAsync(input);
              toast.success('Transaction added');
            }
            close();
          }}
        />
      </Modal>
    </DialogContext.Provider>
  );
}

export function useTransactionDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useTransactionDialog must be used inside <TransactionDialogProvider>');
  return ctx;
}
