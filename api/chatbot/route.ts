import { NextResponse } from 'next/server'
import { Pregunta } from '@/app/types'
import qaPairs from '@/app/json/respuestas.json' // Asegúrate de colocar la ruta correcta a tu JSON

export const runtime = 'edge'

function normalizeText(text: string): string {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, '')
}

export async function POST(req: Request) {
  try {
    const { question } = await req.json()
    
    if (!question || question.trim().length < 3) {
      return NextResponse.json(
        { error: 'Por favor escribe una pregunta válida (mínimo 3 caracteres)' },
        { status: 400 }
      )
    }

    // Búsqueda exacta
    const exactMatch = qaPairs.find(q => 
      normalizeText(q.pregunta) === normalizeText(question)
    )
    if (exactMatch) {
      return NextResponse.json({
        response: exactMatch.respuesta,
        status: 'success'
      })
    }

    // Búsqueda por similitud (usa palabras_clave y preguntas)
    const cleanQuestion = normalizeText(question)
    const matches = qaPairs.map(q => ({
      ...q,
      score: calculateMatchScore(cleanQuestion, q)
    })).filter(m => m.score > 0.3) // Filtra coincidencias con score > 30%

    if (matches.length > 0) {
      matches.sort((a, b) => b.score - a.score)
      return NextResponse.json({
        response: matches[0].respuesta,
        status: 'success'
      })
    }

    // Sugerencias si no hay coincidencias
    const suggestions = qaPairs
      .map(q => ({
        pregunta: q.pregunta,
        score: calculateMatchScore(cleanQuestion, q)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // Top 3 sugerencias

    return NextResponse.json({
      response: `¿Quizás quisiste decir:\n${suggestions.map(s => `• ${s.pregunta}`).join('\n')}`,
      status: 'suggestions'
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error procesando tu pregunta' },
      { status: 500 }
    )
  }
}

function calculateMatchScore(question: string, q: Pregunta): number {
  const targetText = normalizeText(q.pregunta)
  const keywords = q.palabras_clave || []
  
  // Combina palabras de la pregunta objetivo + palabras clave
  const allTargetWords = [
    ...targetText.split(/\s+/),
    ...keywords.map(normalizeText)
  ]

  const questionWords = new Set(question.split(/\s+/))
  let score = 0

  // Ponderación: palabras clave valen más
  allTargetWords.forEach(word => {
    if (keywords.includes(word) && questionWords.has(word)) {
      score += 2 // Peso extra para palabras clave
    } else if (questionWords.has(word)) {
      score += 1
    }
  })

  return score / Math.max(questionWords.size, allTargetWords.length)
}