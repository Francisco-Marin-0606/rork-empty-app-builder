export interface User {
	_id: string
	email: string
	names: string
	lastnames: string
	lastMembership: {
		membershipId: string
		membershipDate: string
		membershipPaymentDate: string,
		billingDate: string
		type: string
	}
	source: string
	userLevel: string
}

export function getMembershipStatus(lastMembership: any): string {
	if (!lastMembership?.membershipId) return 'Cancelada'

	if (!lastMembership.type) {
		return 'Cancelada'
	}

	const normalizedType = lastMembership.type.toLowerCase()
	const currentDate = new Date()

	switch (normalizedType) {
		case 'monthly':
		case 'yearly':
			if (lastMembership.membershipPaymentDate) {
				const paymentDate = new Date(lastMembership.membershipPaymentDate.split('T')[0])
				const expirationDate = new Date(paymentDate)
				expirationDate.setDate(paymentDate.getDate() + 30)
				return expirationDate >= currentDate ? 'Activa' : 'Cancelada'
			} else {
				const membershipDate = new Date(lastMembership.membershipDate.split('T')[0])
				const expirationDate = new Date(membershipDate)
				expirationDate.setDate(membershipDate.getDate() + 30)
				return expirationDate >= currentDate ? 'Activa' : 'Cancelada'
			}
		case 'free':
			return 'Activa'
		case 'trial':
			return 'Trial'
		default:
			return 'Cancelada'
	}
}

export function getSubscriptionType(type: string): string {
	switch (type) {
		case 'monthly':
			return 'Mensual'
		case 'yearly':
			return 'Anual'
		case 'free':
			return 'Free'
		case 'trial':
			return 'Trial'
		default:
			return 'Mensual'
	}
}

export function formatDateUTC(dateString: string): string {
	if (!dateString) return '-'

	const date = new Date(dateString)
	const day = date.getDate()
	const month = date.toLocaleDateString('es-ES', { month: 'long' })
	
	return `${day} de ${month.charAt(0).toUpperCase() + month.slice(1)}`
}


