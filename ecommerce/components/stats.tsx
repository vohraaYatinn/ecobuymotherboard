export function Stats() {
  const stats = [
    {
      value: "99.8%",
      label: "Quality Rate",
      description: "Rigorous testing standards",
    },
    {
      value: "48hrs",
      label: "Fast Shipping",
      description: "Global delivery network",
    },
    {
      value: "15+",
      label: "Years Experience",
      description: "Industry expertise",
    },
    {
      value: "100%",
      label: "Satisfaction",
      description: "Money-back guarantee",
    },
  ]

  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="text-4xl font-bold text-primary sm:text-5xl">{stat.value}</div>
              <div className="mt-2 text-base font-semibold text-foreground sm:text-lg">{stat.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
