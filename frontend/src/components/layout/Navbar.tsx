export default function Navbar() {

  return (

<nav className="hidden md:flex items-center gap-8">

<a
href="#"
className="hover:text-red-500 transition"
>
Inicio
</a>

<a
href="#"
className="hover:text-red-500 transition"
>
Jornadas
</a>

<a
href="#"
className="hover:text-red-500 transition"
>
Clasificación
</a>

<a
href="#"
className="hover:text-red-500 transition"
>
Premios
</a>

<button
className="px-5 py-2 rounded-xl border border-red-600 hover:bg-red-600 transition"
>
Ingresar
</button>

<button
className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 transition"
>
Registrarse
</button>

</nav>

  );

}