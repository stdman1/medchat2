// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// GET - Lấy thông tin profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        gender: true,
        height: true,
        weight: true,
        age: true,
        allergies: true,
        hasHypertension: true,
        hasDiabetes: true,
        isSmoker: true,
        currentMedications: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// PUT - Cập nhật thông tin profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      displayName,
      gender,
      height,
      weight,
      age,
      allergies,
      hasHypertension,
      hasDiabetes,
      isSmoker,
      currentMedications
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validation
    if (age && (age < 0 || age > 150)) {
      return NextResponse.json(
        { error: 'Tuổi không hợp lệ' },
        { status: 400 }
      );
    }

    if (height && (height < 50 || height > 300)) {
      return NextResponse.json(
        { error: 'Chiều cao không hợp lệ (50-300cm)' },
        { status: 400 }
      );
    }

    if (weight && (weight < 10 || weight > 500)) {
      return NextResponse.json(
        { error: 'Cân nặng không hợp lệ (10-500kg)' },
        { status: 400 }
      );
    }

    // Cập nhật user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(displayName && { displayName }),
        ...(gender && { gender }),
        ...(height && { height: parseFloat(height) }),
        ...(weight && { weight: parseFloat(weight) }),
        ...(age && { age: parseInt(age) }),
        ...(allergies !== undefined && { allergies }),
        ...(hasHypertension !== undefined && { hasHypertension }),
        ...(hasDiabetes !== undefined && { hasDiabetes }),
        ...(isSmoker !== undefined && { isSmoker }),
        ...(currentMedications !== undefined && { currentMedications })
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        gender: true,
        height: true,
        weight: true,
        age: true,
        allergies: true,
        hasHypertension: true,
        hasDiabetes: true,
        isSmoker: true,
        currentMedications: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}