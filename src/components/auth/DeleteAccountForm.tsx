"use client";

import { useState, useTransition } from "react";

import { deleteAccountAction } from "@/lib/auth/actions";

import styles from "./DeleteAccountForm.module.scss";

const CONFIRM = "SİL";

/**
 * Hesap silme akışı — KVKK m. 11/1-e kapsamında kullanıcının silme hakkı.
 * İki aşamalı: önce bilgilendirme, sonra kullanıcının "SİL" yazması gereken
 * onay. Yanlışlıkla silme riskini azaltır; geri alınamaz olduğu için
 * tasarım bilerek sürtüşmeli.
 */
export function DeleteAccountForm() {
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ready = confirm === CONFIRM;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccountAction();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Beklenmeyen bir hata oluştu, lütfen tekrar dene.",
        );
      }
    });
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Hesabı Sil</h2>
      <p className={styles.body}>
        Hesabını silmek, kullanıcı bilgilerini, takip listeni ve ürün içindeki
        tüm oturumlarını kalıcı olarak kaldırır. Bu işlem geri alınamaz. Diğer
        KVKK haklarını (veriye erişim, düzeltme, aktarıma itiraz)
        kullanmak için KVKK Aydınlatma Metni'ndeki başvuru yöntemini
        izleyebilirsin.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="confirm">
          Devam etmek için <strong>{CONFIRM}</strong> yaz:
        </label>
        <input
          id="confirm"
          className={styles.input}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.toLocaleUpperCase("tr"))}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={CONFIRM}
          aria-invalid={confirm.length > 0 && !ready}
        />

        {error ? (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.danger}
            disabled={!ready || pending}
          >
            {pending ? "Siliniyor…" : "Hesabımı kalıcı olarak sil"}
          </button>
        </div>
      </form>
    </section>
  );
}
