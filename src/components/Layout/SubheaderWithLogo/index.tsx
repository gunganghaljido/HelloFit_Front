import { useRouter } from 'next/router';
import IconComponent from '@/components/Asset/Icon';
import styles from './SubheaderWithLogo.module.scss';
import { SubheaderWithLogoProps } from './SubheaderWithLogo.types';

export default function SubheaderWithLogo({
  showMenu = true,
}: SubheaderWithLogoProps) {
  const router = useRouter();

  const handleLogoClick = () => {
    router.push('/map');
  };

  return (
    <header className={styles.container}>
      <div className={styles.btnContainer} onClick={handleLogoClick}>
        <IconComponent name="logoBlue" width={60} height={34} />
      </div>
      {showMenu && (
        <div className={styles.btnContainer}>
          <IconComponent name="menu" size="l" />
        </div>
      )}
    </header>
  );
}
