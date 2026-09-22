import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <main className="main">
      <div className="eyebrow">Evercrafted Studio · SaaS</div>
      <h1 className="title">From an idea to something you can build and sell.</h1>
      <p className="lede">
        Evercrafted Studio combines inventory intelligence, deterministic wreath geometry,
        blueprinting, visualization, rendering, production guidance and selling assets in one project.
      </p>
      <div className="hero-actions">
        <SignedOut><SignInButton mode="modal"><button className="btn">Sign in</button></SignInButton></SignedOut>
        <SignedIn>
          <Link className="btn" href="/studio">Open Studio</Link>
          <UserButton />
        </SignedIn>
      </div>
      <section className="grid">
        <article className="card"><div className="eyebrow">01 · Begin</div><h2>Memory or brief</h2><p>Translate a customer story into Essence and design intent before geometry begins.</p></article>
        <article className="card"><div className="eyebrow">02 · Use reality</div><h2>Your inventory</h2><p>Design against materials you actually own, with roles, dimensions, quantities and costs attached.</p></article>
        <article className="card"><div className="eyebrow">03 · Build</div><h2>Deterministic blueprint</h2><p>Evercrafted controls placement geometry; image models create realism rather than inventing structure.</p></article>
      </section>
    </main>
  );
}
