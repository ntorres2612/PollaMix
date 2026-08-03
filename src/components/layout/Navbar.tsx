import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";

export default function Navbar() {
  return (
    <nav
      className="
        fixed
        top-0
        left-0
        right-0
        z-50
        bg-[#071321]/90
        backdrop-blur-md
        border-b
        border-white/10
      "
    >
      <Container>

        <div className="flex h-20 items-center justify-between">

          {/* Logo */}

          <h1 className="text-3xl font-black tracking-wide">
            POLLA{" "}
            <span className="text-red-600">
              MIX
            </span>
          </h1>

          {/* Menú */}

          <ul className="hidden md:flex items-center gap-10">

            <li className="hover:text-red-500 cursor-pointer transition">
              Inicio
            </li>

            <li className="hover:text-red-500 cursor-pointer transition">
              Cómo funciona
            </li>

            <li className="hover:text-red-500 cursor-pointer transition">
              Partidos
            </li>

            <li className="hover:text-red-500 cursor-pointer transition">
              Premios
            </li>

            <li className="hover:text-red-500 cursor-pointer transition">
              Contacto
            </li>

          </ul>

          <Button>
            Participar
          </Button>

        </div>

      </Container>
    </nav>
  );
}