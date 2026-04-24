import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

/* Outfit grid thumbnails — lightweight Unsplash fashion shots. */
const gridOutfits = [
  "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=400&auto=format&fit=crop",
];

export default function Home() {
  return (
    <div className={styles.container}>
      <nav className={styles.landingNav}>
        <div className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>Home</Link>
          <Link href="/products?category=collection" className={styles.navLink}>Collection</Link>
          <Link href="/products" className={styles.navLink}>Shop</Link>
          <Link href="/about" className={styles.navLink}>About us</Link>
        </div>
        <Link href="/login" className={styles.navSignIn}>Sign In</Link>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.mirrorGlass}></div>
          <Image
            src="/hero.png"
            alt="Fashion Model"
            width={420}
            height={600}
            className={styles.heroModel}
            priority
          />
        </div>
        <div className={styles.heroRight}>
          <h1 className={styles.title}>
            Your Comfort,<br />
            <span className={styles.titleAccent}>Our Quality</span>
          </h1>
          <p className={styles.subtitle}>
            Explore just dropped collection, find your collection, make your
          </p>
          <div className={styles.styleText}>Style</div>
        </div>
      </section>

      <section className={styles.jacketSection}>
        <div className={styles.jacketBackground}></div>
        <div className={styles.jacketDiagonal}></div>
        <div className={styles.jacketContent}>
          <div className={styles.jacketText}>
            <p className={styles.jacketDesc}>
              Explore our just dropped collection and find the pieces that were
              made for you. From everyday essentials to statement styles, every
              item is crafted with care, built to last, and designed to feel as
              good as it looks. This is your wardrobe, your way and it starts
              right here.
            </p>
          </div>
          <div className={styles.jacketImageWrapper}>
            <Image
              src="/jacket.png"
              alt="Denim Jacket"
              width={600}
              height={550}
              className={styles.jacketImage}
            />
          </div>
        </div>
      </section>

      <section className={styles.jeansSection}>
        <Image
          src="/pant.png"
          alt="Jeans"
          width={700}
          height={1000}
          className={styles.jeansBackground}
        />
        <div className={styles.gridContainer}>
          {gridOutfits.map((src, i) => (
            <div key={i} className={styles.gridItem}>
              <Image
                src={src}
                alt={`Outfit ${i + 1}`}
                width={200}
                height={260}
                className={styles.gridImage}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.shoesSection}>
        <Image
          src="/shoes.png"
          alt="Sneakers"
          width={500}
          height={380}
          className={styles.shoesImage}
        />
      </section>
    </div>
  );
}
