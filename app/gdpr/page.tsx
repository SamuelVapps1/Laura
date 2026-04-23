import Link from "next/link"
import { Card } from "@/components/ui"

export default function GdprPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Späť</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Ochrana osobných údajov (GDPR)</h1>
      </div>

      <Card className="p-6 prose prose-sm max-w-none text-gray-700 space-y-4">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-900">Kto spracúva údaje</h2>
          <p>Táto aplikácia slúži výhradne pre interné potreby psieho salónu. Osobné údaje sú spracúvané prevádzkovateľom salónu.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-900">Aké údaje zbierame</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Meno majiteľa psa</li>
            <li>Telefónne číslo (voliteľné)</li>
            <li>Informácie o psovi (meno, plemeno, vek)</li>
            <li>Poznámky k termínom a správaniu zvieraťa</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-900">Účel spracovania</h2>
          <p>Údaje sú zbierané výhradne za účelom vedenia evidencie termínov a histórie starostlivosti o zvieratá. Nie sú zdieľané s tretími stranami.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-900">Uchovávanie údajov</h2>
          <p>Údaje sú uložené v zabezpečenej cloudovej databáze (Supabase, servery v EÚ). Sú uchovávané po dobu prevádzky salónu alebo do ich vymazania.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-900">Práva dotknutej osoby</h2>
          <p>Klient má právo požiadať o vymazanie svojich údajov. Vymazanie je možné priamo v aplikácii cez profil klienta (tlačidlo „Zmazať").</p>
        </section>
      </Card>
    </div>
  )
}
