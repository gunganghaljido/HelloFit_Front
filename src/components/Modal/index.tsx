import { useRef } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { modalState } from '@/states/modalState';
import styles from './Modal.module.scss';
import useOutsideClick from '@/hooks/useOutsideClick';
import { toggleState } from '@/states/toggleState';

export default function Modal() {
  const [modal, setModal] = useRecoilState(modalState);
  const modalRef = useRef<HTMLDivElement>(null);
  const toggle = useRecoilValue(toggleState);

  const handleClose = () => {
    setModal({ ...modal, isOpen: false });
    if (typeof modal.onClose === 'function') {
      modal.onClose();
    }
  };

  const handleConfirm = () => {
    setModal({ ...modal, isOpen: false });
    if (typeof modal.onConfirm === 'function') {
      modal.onConfirm();
    }
  };

  useOutsideClick(modalRef, handleClose);

  if (!modal.isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} ref={modalRef}>
        <div className={styles.texts}>
          <p className={styles.text}>{modal.content}</p>
          <p className={styles.text}>하시겠어요?</p>
        </div>
        <div className={styles.buttons}>
          <button className={styles.button} onClick={handleClose}>
            취소
          </button>
          <button
            className={`${toggle === 'general' ? styles.confirm : styles.confirmSP}`}
            onClick={handleConfirm}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
