import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <!-- Floating Header -->
  <header class="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-sm transition-all duration-300 border-b border-white/10">
    <div class="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center">
      <a href="#" class="text-white text-2xl tracking-[0.2em] font-light hover:text-sand-200 transition-colors">
        LOVISA HULEDAL
      </a>
      <nav class="mt-4 md:mt-0 flex gap-8 text-sm tracking-widest text-gray-200">
        <a href="#about" class="hover:text-white transition-colors">ABOUT</a>
        <a href="#schedule" class="hover:text-white transition-colors">SCHEDULE</a>
        <a href="#listen" class="hover:text-white transition-colors">LISTEN</a>
        <a href="#pictures" class="hover:text-white transition-colors">PICTURES</a>
        <a href="#contact" class="hover:text-white transition-colors">CONTACT</a>
      </nav>
    </div>
  </header>

  <!-- Hero Section -->
  <main>
    <section id="home" class="relative h-screen w-full hero-image flex items-center justify-center">
      <!-- Dark overlay for better text readability if needed -->
      <div class="absolute inset-0 bg-black/20"></div>
      
      <!-- Optional centered content over the hero image -->
      <div class="relative z-10 text-center px-4">
        <!-- Could add some hero text here if desired, but user mainly wanted the image on top -->
      </div>
    </section>

    <!-- Content Sections Example -->
    <section id="about" class="py-32 px-6 max-w-4xl mx-auto text-center">
      <h2 class="text-3xl tracking-widest font-light mb-8 text-gray-900">ABOUT</h2>
      <p class="text-lg text-gray-600 leading-relaxed font-light">
        Mezzo-soprano Lovisa Huledal is a versatile and expressive artist. 
        With a warm and colorful voice, she performs repertoire ranging from early music to contemporary works.
      </p>
    </section>

    <section id="schedule" class="py-32 px-6 bg-sand-100">
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl tracking-widest font-light mb-8 text-gray-900">SCHEDULE</h2>
        <p class="text-lg text-gray-600 leading-relaxed font-light">
          Upcoming performances will be listed here.
        </p>
      </div>
    </section>
  </main>
`
